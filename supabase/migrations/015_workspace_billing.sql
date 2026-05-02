-- ============================================================
-- Workspace-level minute pool + seat sync prep
-- ============================================================
-- Moves usage tracking from per-user (profiles) to per-workspace so that
-- members of a paid workspace share the workspace's monthly pool. Adds
-- stripe_subscription_id on profiles so we can update Stripe quantity
-- when a workspace's seat count changes.

-- ------------------------------------------------------------
-- 1. Workspace usage columns
-- ------------------------------------------------------------

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS minutes_used_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minutes_limit integer NOT NULL DEFAULT 100;

-- Backfill: each workspace inherits its owner's current limits and usage
UPDATE public.workspaces w
SET minutes_used_this_month = COALESCE(p.minutes_used_this_month, 0),
    minutes_limit = COALESCE(p.minutes_limit, 100)
FROM public.profiles p
WHERE p.id = w.owner_id;

-- ------------------------------------------------------------
-- 2. Subscription id on owner profile (for seat sync)
-- ------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- ------------------------------------------------------------
-- 3. Atomic increment helper for workspace minutes
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_workspace_minutes(
  ws_id uuid,
  minutes integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  UPDATE public.workspaces
  SET minutes_used_this_month = minutes_used_this_month + minutes
  WHERE id = ws_id
  RETURNING minutes_used_this_month INTO new_total;
  RETURN new_total;
END;
$$;

-- ------------------------------------------------------------
-- 4. Reset all workspaces owned by a user (called from Stripe webhook
--    when a new billing cycle starts). Keeps usage rollover honest.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_owner_workspace_usage(
  owner_id_in uuid
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.workspaces
  SET minutes_used_this_month = 0
  WHERE owner_id = owner_id_in;
$$;

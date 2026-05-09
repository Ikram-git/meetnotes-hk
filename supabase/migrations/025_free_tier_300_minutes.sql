-- ============================================================
-- Free tier minute cap: 100 → 300
-- ============================================================
-- Marketing change. Bumps the column default for new signups and
-- migrates existing free-tier users (subscription_tier = 'free')
-- to the new cap. Paid tiers untouched — their cap is set by the
-- Stripe webhook from the plan they selected.

ALTER TABLE public.profiles
  ALTER COLUMN minutes_limit SET DEFAULT 300;

UPDATE public.profiles
SET minutes_limit = 300
WHERE COALESCE(subscription_tier, 'free') = 'free'
  AND minutes_limit < 300;

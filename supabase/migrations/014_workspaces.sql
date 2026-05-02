-- ============================================================
-- Phase 1: Workspaces, members, invites
-- ============================================================
-- Introduces team workspaces. Every existing user gets a personal
-- workspace backfilled. Future signups auto-create one via the
-- handle_new_user trigger. RLS on meetings (and downstream tables)
-- is rewritten to "you can see it if you're a member of the workspace
-- it belongs to," replacing the prior user_id-only check.

-- ------------------------------------------------------------
-- 1. New tables
-- ------------------------------------------------------------

CREATE TABLE public.workspaces (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('owner','admin','member')),
  invited_by   uuid REFERENCES public.profiles(id),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

CREATE TABLE public.workspace_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         text NOT NULL CHECK (role IN ('admin','member')),
  invited_by   uuid NOT NULL REFERENCES public.profiles(id),
  token        text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_workspace_pending
  ON public.workspace_invites(workspace_id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_invites_email_pending
  ON public.workspace_invites(lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ------------------------------------------------------------
-- 2. Add workspace_id to meetings (nullable for backfill)
-- ------------------------------------------------------------

ALTER TABLE public.meetings
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 3. Backfill: every existing user gets a personal workspace
-- ------------------------------------------------------------

DO $$
DECLARE
  u RECORD;
  new_ws_id uuid;
BEGIN
  FOR u IN SELECT id, full_name, email FROM public.profiles LOOP
    INSERT INTO public.workspaces (name, owner_id)
    VALUES (
      COALESCE(u.full_name, split_part(u.email, '@', 1)) || '''s Workspace',
      u.id
    )
    RETURNING id INTO new_ws_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_ws_id, u.id, 'owner');

    UPDATE public.meetings SET workspace_id = new_ws_id WHERE user_id = u.id;
  END LOOP;
END $$;

ALTER TABLE public.meetings ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX idx_meetings_workspace ON public.meetings(workspace_id);

-- ------------------------------------------------------------
-- 4. Update handle_new_user trigger to also create personal workspace
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_ws_id uuid;
  display_name text;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.workspaces (name, owner_id)
  VALUES (display_name || '''s Workspace', NEW.id)
  RETURNING id INTO new_ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_ws_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 5. Helper functions used by RLS policies
-- ------------------------------------------------------------
-- SECURITY DEFINER + STABLE so policies can call them without recursion
-- and so the planner caches results per query.

CREATE OR REPLACE FUNCTION public.user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_workspace_role(ws_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE user_id = auth.uid() AND workspace_id = ws_id;
$$;

-- ------------------------------------------------------------
-- 6. Enable RLS on new tables
-- ------------------------------------------------------------

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- workspaces ------------------------------------------------

CREATE POLICY "Members view their workspaces"
  ON public.workspaces FOR SELECT
  USING (id IN (SELECT public.user_workspace_ids()));

CREATE POLICY "Authenticated users create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins update workspace"
  ON public.workspaces FOR UPDATE
  USING (public.user_workspace_role(id) IN ('owner','admin'));

CREATE POLICY "Owner deletes workspace"
  ON public.workspaces FOR DELETE
  USING (public.user_workspace_role(id) = 'owner');

-- workspace_members -----------------------------------------

CREATE POLICY "Members view workspace members"
  ON public.workspace_members FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

-- Self-insert (used by signup trigger and accept-invite RPC)
CREATE POLICY "User inserts self as member"
  ON public.workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Owner can demote/promote (excluding self-demotion of owner — enforced in app)
CREATE POLICY "Owner changes member roles"
  ON public.workspace_members FOR UPDATE
  USING (public.user_workspace_role(workspace_id) = 'owner');

-- Admin/owner can remove non-owners; user can remove self
CREATE POLICY "Admins remove members; user removes self"
  ON public.workspace_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR (
      public.user_workspace_role(workspace_id) IN ('owner','admin')
      AND role <> 'owner'
    )
  );

-- workspace_invites -----------------------------------------

CREATE POLICY "Admins view invites"
  ON public.workspace_invites FOR SELECT
  USING (public.user_workspace_role(workspace_id) IN ('owner','admin'));

CREATE POLICY "Admins create invites"
  ON public.workspace_invites FOR INSERT
  WITH CHECK (public.user_workspace_role(workspace_id) IN ('owner','admin'));

CREATE POLICY "Admins revoke invites"
  ON public.workspace_invites FOR UPDATE
  USING (public.user_workspace_role(workspace_id) IN ('owner','admin'));

CREATE POLICY "Admins delete invites"
  ON public.workspace_invites FOR DELETE
  USING (public.user_workspace_role(workspace_id) IN ('owner','admin'));

-- ------------------------------------------------------------
-- 7. Rewrite meetings RLS: workspace membership instead of user_id
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own meetings"   ON public.meetings;
DROP POLICY IF EXISTS "Users can insert own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can update own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can delete own meetings" ON public.meetings;

CREATE POLICY "Members view workspace meetings"
  ON public.meetings FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

CREATE POLICY "Members insert workspace meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT public.user_workspace_ids())
    AND user_id = auth.uid()
  );

CREATE POLICY "Members update workspace meetings"
  ON public.meetings FOR UPDATE
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

CREATE POLICY "Members delete workspace meetings"
  ON public.meetings FOR DELETE
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

-- ------------------------------------------------------------
-- 8. Rewrite RLS on tables scoped through meeting_id
--    The simpler "meeting_id IN (SELECT id FROM meetings)" inherits
--    from the meetings policy above — no role checks needed here.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own transcript segments"   ON public.transcript_segments;
DROP POLICY IF EXISTS "Users can insert own transcript segments" ON public.transcript_segments;
DROP POLICY IF EXISTS "Users can update own transcript segments" ON public.transcript_segments;
DROP POLICY IF EXISTS "Users can delete own transcript segments" ON public.transcript_segments;

CREATE POLICY "Members view transcript segments"
  ON public.transcript_segments FOR SELECT
  USING (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members insert transcript segments"
  ON public.transcript_segments FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members update transcript segments"
  ON public.transcript_segments FOR UPDATE
  USING (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members delete transcript segments"
  ON public.transcript_segments FOR DELETE
  USING (meeting_id IN (SELECT id FROM public.meetings));

DROP POLICY IF EXISTS "Users can view own summaries"   ON public.summaries;
DROP POLICY IF EXISTS "Users can insert own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can update own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON public.summaries;

CREATE POLICY "Members view summaries"
  ON public.summaries FOR SELECT
  USING (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members insert summaries"
  ON public.summaries FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members update summaries"
  ON public.summaries FOR UPDATE
  USING (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members delete summaries"
  ON public.summaries FOR DELETE
  USING (meeting_id IN (SELECT id FROM public.meetings));

DROP POLICY IF EXISTS "Users can view own speaker mappings"   ON public.speaker_mappings;
DROP POLICY IF EXISTS "Users can insert own speaker mappings" ON public.speaker_mappings;
DROP POLICY IF EXISTS "Users can update own speaker mappings" ON public.speaker_mappings;
DROP POLICY IF EXISTS "Users can delete own speaker mappings" ON public.speaker_mappings;

CREATE POLICY "Members view speaker mappings"
  ON public.speaker_mappings FOR SELECT
  USING (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members insert speaker mappings"
  ON public.speaker_mappings FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members update speaker mappings"
  ON public.speaker_mappings FOR UPDATE
  USING (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members delete speaker mappings"
  ON public.speaker_mappings FOR DELETE
  USING (meeting_id IN (SELECT id FROM public.meetings));

DROP POLICY IF EXISTS "Users read their own meeting chats"        ON public.meeting_chats;
DROP POLICY IF EXISTS "Users insert chats on their own meetings"  ON public.meeting_chats;
DROP POLICY IF EXISTS "Users delete chats on their own meetings"  ON public.meeting_chats;

CREATE POLICY "Members view meeting chats"
  ON public.meeting_chats FOR SELECT
  USING (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members insert meeting chats"
  ON public.meeting_chats FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM public.meetings));

CREATE POLICY "Members delete meeting chats"
  ON public.meeting_chats FOR DELETE
  USING (meeting_id IN (SELECT id FROM public.meetings));

-- exports stays user-scoped (it's an audit log of who exported what).
-- api_keys and webhook_subscriptions stay user-scoped for now.

-- ============================================================
-- Per-meeting comments — workspace members can leave notes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meeting_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_comments_meeting
  ON public.meeting_comments(meeting_id, created_at DESC);

CREATE TRIGGER meeting_comments_updated_at
  BEFORE UPDATE ON public.meeting_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.meeting_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read meeting comments"
  ON public.meeting_comments FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE workspace_id IN (SELECT public.user_workspace_ids())
    )
  );

CREATE POLICY "Members create comments"
  ON public.meeting_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND meeting_id IN (
      SELECT id FROM public.meetings
      WHERE workspace_id IN (SELECT public.user_workspace_ids())
    )
  );

CREATE POLICY "Author edits own comment"
  ON public.meeting_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Author or workspace admin deletes"
  ON public.meeting_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR meeting_id IN (
      SELECT id FROM public.meetings
      WHERE public.user_workspace_role(workspace_id) IN ('owner', 'admin')
    )
  );

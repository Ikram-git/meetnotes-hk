-- ============================================================
-- Tasks: assignable, trackable work items per workspace.
-- Most are auto-promoted from a meeting's AI-extracted action items;
-- members can also create manual tasks not tied to a meeting.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id               uuid REFERENCES public.meetings(id) ON DELETE CASCADE,
  source_action_item_index integer,                        -- index into summaries.action_items, when AI-derived
  title                    text NOT NULL,
  description              text,
  assignee_user_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_label           text,                           -- speaker label / free-text fallback when no profile match
  due_date                 date,
  status                   text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority                 text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  created_by               uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at             timestamptz,
  completed_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace
  ON public.tasks(workspace_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee
  ON public.tasks(assignee_user_id) WHERE status <> 'done';
CREATE INDEX IF NOT EXISTS idx_tasks_meeting
  ON public.tasks(meeting_id);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read workspace tasks"
  ON public.tasks FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

CREATE POLICY "Members create workspace tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids()));

CREATE POLICY "Assignee, creator, or admin updates"
  ON public.tasks FOR UPDATE
  USING (
    assignee_user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.user_workspace_role(workspace_id) IN ('owner','admin')
  );

CREATE POLICY "Creator or admin deletes"
  ON public.tasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.user_workspace_role(workspace_id) IN ('owner','admin')
  );

-- ------------------------------------------------------------
-- Backfill: every existing AI-extracted action item becomes a task.
-- Speaker labels like "Anna" / "Speaker 1" are kept as assignee_label
-- (fuzzy matching to profiles happens app-side so this stays simple).
-- ------------------------------------------------------------

DO $$
DECLARE
  s RECORD;
  item jsonb;
  idx int;
  ws_id uuid;
  m_owner uuid;
BEGIN
  FOR s IN
    SELECT m.id AS meeting_id, m.workspace_id, m.user_id, sm.action_items
    FROM public.summaries sm
    JOIN public.meetings m ON m.id = sm.meeting_id
    WHERE jsonb_array_length(COALESCE(sm.action_items, '[]'::jsonb)) > 0
  LOOP
    ws_id := s.workspace_id;
    m_owner := s.user_id;
    idx := 0;
    FOR item IN SELECT * FROM jsonb_array_elements(s.action_items) LOOP
      INSERT INTO public.tasks (
        workspace_id, meeting_id, source_action_item_index,
        title, assignee_label, status, created_by
      ) VALUES (
        ws_id,
        s.meeting_id,
        idx,
        COALESCE(item->>'text', '(untitled)'),
        item->>'assignee',
        CASE WHEN item->>'status' = 'done' THEN 'done' ELSE 'todo' END,
        m_owner
      );
      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- Workspace-shared custom vocabulary
-- ============================================================
-- A list of terms (proper nouns, jargon, product names) per
-- workspace that gets piped into the transcriber as keyword
-- boosts so it stops mangling things like "MeetBriva" → "meet
-- breaver" or "Voyage AI" → "vajiya". Shared across the team —
-- one member adds a term, everyone's transcripts benefit.

CREATE TABLE public.workspace_vocabulary (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  term         text NOT NULL,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_workspace_vocab_unique
  ON public.workspace_vocabulary(workspace_id, lower(term));

CREATE INDEX idx_workspace_vocab_ws ON public.workspace_vocabulary(workspace_id);

ALTER TABLE public.workspace_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace vocabulary"
  ON public.workspace_vocabulary FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

CREATE POLICY "Members add vocabulary"
  ON public.workspace_vocabulary FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT public.user_workspace_ids())
    AND created_by = auth.uid()
  );

-- Creator can delete their own; admins/owners can delete anyone's.
CREATE POLICY "Members delete vocabulary"
  ON public.workspace_vocabulary FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.user_workspace_role(workspace_id) IN ('owner','admin')
  );

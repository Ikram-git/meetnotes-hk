-- ============================================================
-- Persistent cross-meeting chat threads (per user, per workspace)
-- ============================================================
-- One thread = one conversation. Messages live in workspace_chat_messages
-- and reference back. Threads are scoped to a single user — workspace
-- members don't see each other's past chats by default.

CREATE TABLE IF NOT EXISTS public.workspace_chat_threads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_user_workspace
  ON public.workspace_chat_threads(user_id, workspace_id, updated_at DESC);

CREATE TRIGGER chat_threads_updated_at
  BEFORE UPDATE ON public.workspace_chat_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS public.workspace_chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES public.workspace_chat_threads(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL,
  citations   jsonb,
  turn_index  int NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msgs_thread
  ON public.workspace_chat_messages(thread_id, turn_index);

-- ------------------------------------------------------------
-- RLS — caller can only see their own threads in their own workspaces.
-- (Most app-layer access uses the admin client after a getUser() check,
-- so RLS here is defence-in-depth, not the primary gate.)
-- ------------------------------------------------------------

ALTER TABLE public.workspace_chat_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views own threads"
  ON public.workspace_chat_threads FOR SELECT
  USING (
    user_id = auth.uid()
    AND workspace_id IN (SELECT public.user_workspace_ids())
  );

CREATE POLICY "Owner creates own threads"
  ON public.workspace_chat_threads FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (SELECT public.user_workspace_ids())
  );

CREATE POLICY "Owner updates own threads"
  ON public.workspace_chat_threads FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Owner deletes own threads"
  ON public.workspace_chat_threads FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Owner views own messages"
  ON public.workspace_chat_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM public.workspace_chat_threads WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner inserts own messages"
  ON public.workspace_chat_messages FOR INSERT
  WITH CHECK (
    thread_id IN (
      SELECT id FROM public.workspace_chat_threads WHERE user_id = auth.uid()
    )
  );

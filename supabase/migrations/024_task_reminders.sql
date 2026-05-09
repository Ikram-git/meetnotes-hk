-- ============================================================
-- Daily task reminder emails: track when we last reminded each
-- assignee about a task so the cron job doesn't spam.
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- Index used by the cron job to find tasks needing a reminder:
-- "open tasks with a due_date and an assignee that haven't been
-- reminded today."
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_candidates
  ON public.tasks(due_date, last_reminder_sent_at)
  WHERE status <> 'done' AND assignee_user_id IS NOT NULL;

-- ============================================================
-- Auto-email recap to meeting attendees
-- ============================================================
-- profiles.auto_email_recap: workspace owner's "fire after every
--   meeting" preference. Defaults off so we don't surprise users.
-- meetings.auto_recap_sent_at: lockout to prevent duplicate sends if
--   summarisation is retried.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_email_recap boolean NOT NULL DEFAULT false;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS auto_recap_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_recap_recipient_count integer;

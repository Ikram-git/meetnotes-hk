-- ============================================================
-- Audio retention policy
-- ============================================================
-- Privacy / enterprise-trust feature. Lets workspace owners
-- choose what happens to the raw audio file after transcription:
--   - 'keep':         retain forever (default; current behavior)
--   - 'delete_after_processing': delete audio immediately after
--                     summary is generated; keep transcript +
--                     summary
--   - 'delete_after_30_days' / 'delete_after_7_days': time-based
-- Per-meeting override allowed via the `audio_delete_at` column
-- (cron sweeps meetings whose timestamp has elapsed).

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS audio_retention text NOT NULL DEFAULT 'keep'
    CHECK (audio_retention IN ('keep', 'delete_after_processing', 'delete_after_7_days', 'delete_after_30_days'));

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS audio_delete_at timestamptz,
  ADD COLUMN IF NOT EXISTS audio_deleted_at timestamptz;

-- Index used by the daily retention cron.
CREATE INDEX IF NOT EXISTS idx_meetings_audio_delete_at
  ON public.meetings(audio_delete_at)
  WHERE audio_delete_at IS NOT NULL AND audio_deleted_at IS NULL AND audio_storage_path IS NOT NULL;

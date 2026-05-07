-- ============================================================
-- Persist auto-recap skip reasons on the meeting itself so we can
-- debug without trawling through Vercel function logs.
-- ============================================================

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS auto_recap_skip_reason text;

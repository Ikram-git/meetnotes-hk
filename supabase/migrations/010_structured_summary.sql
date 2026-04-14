-- Structured summary fields
--
-- Evolves the summaries table from a single blob of text + disconnected
-- JSON arrays into a properly structured Notes object with an Overview
-- (TL;DR) and a Key Points bullet list. The existing `summary_text` column
-- is kept for backwards compatibility with older rows.
--
-- `key_decisions` is also kept in the table so we don't lose data, but new
-- summaries will no longer populate it — it's being removed from the UI in
-- favour of a future AI Recommendations section.

ALTER TABLE public.summaries
  ADD COLUMN IF NOT EXISTS overview TEXT,
  ADD COLUMN IF NOT EXISTS overview_zh TEXT,
  ADD COLUMN IF NOT EXISTS key_points JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.summaries.overview IS '1-2 sentence TL;DR of the meeting';
COMMENT ON COLUMN public.summaries.overview_zh IS 'Traditional Chinese TL;DR (bilingual mode only)';
COMMENT ON COLUMN public.summaries.key_points IS 'Array of {text, text_zh?} bullet points describing the main discussion';

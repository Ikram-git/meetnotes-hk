-- ============================================================
-- RPC Functions
-- ============================================================

-- Increment minutes used (atomic operation)
CREATE OR REPLACE FUNCTION increment_minutes_used(user_id UUID, minutes INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET minutes_used_this_month = minutes_used_this_month + minutes
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset monthly usage (run via cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET minutes_used_this_month = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Full-text search on transcripts
CREATE OR REPLACE FUNCTION search_transcripts(user_id UUID, search_query TEXT)
RETURNS TABLE(meeting_id UUID, meeting_title TEXT, segment_text TEXT, relevance REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS meeting_id,
    m.title AS meeting_title,
    ts.text AS segment_text,
    ts_rank(to_tsvector('english', ts.text), plainto_tsquery('english', search_query)) AS relevance
  FROM public.transcript_segments ts
  JOIN public.meetings m ON m.id = ts.meeting_id
  WHERE m.user_id = search_transcripts.user_id
    AND to_tsvector('english', ts.text) @@ plainto_tsquery('english', search_query)
  ORDER BY relevance DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

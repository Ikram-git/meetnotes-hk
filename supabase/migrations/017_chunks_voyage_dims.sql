-- ============================================================
-- Switch transcript_chunks embedding to 1024 dims (Voyage / OpenAI-1024)
-- ============================================================
-- The original 1536-dim column was sized for OpenAI text-embedding-3-small
-- defaults. We're moving to Voyage as the primary embedding provider
-- (Anthropic-recommended, generous free tier, voyage-3 is 1024 dims).
-- OpenAI is kept as a fallback by passing dimensions=1024 explicitly so
-- both providers fit the same column.
--
-- Safe to run because the column is empty (no rows yet — backfill is gated
-- behind a successful embed call which has been failing on quota).

DROP INDEX IF EXISTS idx_chunks_embedding;
ALTER TABLE public.transcript_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.transcript_chunks ADD COLUMN embedding vector(1024);

CREATE INDEX idx_chunks_embedding
  ON public.transcript_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Replace the RPC with the new dimension. Drop first so the signature
-- change is unambiguous (Postgres can't overload by parameter type for
-- this RPC's named-arg call style.)
DROP FUNCTION IF EXISTS public.match_workspace_chunks(
  vector(1536), uuid, int, float
);

CREATE OR REPLACE FUNCTION public.match_workspace_chunks(
  query_embedding vector(1024),
  workspace_id_in uuid,
  match_count int DEFAULT 8,
  similarity_threshold float DEFAULT 0.4
) RETURNS TABLE (
  id                  uuid,
  meeting_id          uuid,
  meeting_title       text,
  meeting_created_at  timestamptz,
  text                text,
  start_ms            int,
  speaker_label       text,
  similarity          float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.meeting_id,
    m.title           AS meeting_title,
    m.created_at      AS meeting_created_at,
    c.text,
    c.start_ms,
    c.speaker_label,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.transcript_chunks c
  JOIN public.meetings m ON m.id = c.meeting_id
  WHERE c.workspace_id = workspace_id_in
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- Cross-meeting AI chat: vector index over chunked transcripts
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.transcript_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chunk_index  integer NOT NULL,
  text         text NOT NULL,
  start_ms     integer,
  end_ms       integer,
  speaker_label text,
  embedding    vector(1536),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_meeting   ON public.transcript_chunks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_chunks_workspace ON public.transcript_chunks(workspace_id);

-- HNSW index for cosine similarity. Good recall, no training step.
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON public.transcript_chunks
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view chunks"
  ON public.transcript_chunks FOR SELECT
  USING (workspace_id IN (SELECT public.user_workspace_ids()));

-- ------------------------------------------------------------
-- Vector search RPC scoped to a single workspace.
-- Returns top N chunks ranked by cosine similarity, joined with
-- meeting title/created_at for citation rendering.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.match_workspace_chunks(
  query_embedding vector(1536),
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

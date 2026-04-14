-- ============================================================================
-- 001_initial_schema.sql
-- ============================================================================

-- ============================================================
-- Users (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',           -- 'en', 'zh-Hant', 'both'
  preferred_summary_style TEXT DEFAULT 'concise', -- 'concise', 'detailed', 'bullet'
  timezone TEXT DEFAULT 'Asia/Hong_Kong',
  stripe_customer_id TEXT,
  subscription_tier TEXT DEFAULT 'free',          -- 'free', 'pro', 'team'
  subscription_status TEXT DEFAULT 'active',      -- 'active', 'cancelled', 'past_due'
  minutes_used_this_month INTEGER DEFAULT 0,
  minutes_limit INTEGER DEFAULT 100,              -- Free tier: 100 min/month
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Meetings
-- ============================================================
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,                                     -- Auto-generated or user-set
  description TEXT,

  -- Audio
  audio_storage_path TEXT,                        -- Path in Supabase Storage
  audio_duration_seconds INTEGER,
  audio_format TEXT,                              -- 'mp3', 'wav', 'm4a', 'webm'
  audio_size_bytes BIGINT,

  -- Source
  source TEXT NOT NULL DEFAULT 'upload',          -- 'upload', 'chrome_extension', 'api'
  source_url TEXT,                                -- URL if recorded from browser tab

  -- Processing status
  status TEXT NOT NULL DEFAULT 'uploaded',
  -- Statuses: 'uploaded' → 'transcribing' → 'transcribed' → 'summarising' → 'completed' → 'error'
  error_message TEXT,

  -- STT metadata
  stt_provider TEXT,                              -- 'deepgram', 'google', 'assemblyai'
  detected_languages TEXT[],                      -- e.g. ['en', 'yue']

  -- Timestamps
  meeting_date TIMESTAMPTZ,                       -- When the meeting actually happened
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_created_at ON public.meetings(created_at DESC);

-- ============================================================
-- Transcript Segments (individual utterances/chunks)
-- ============================================================
CREATE TABLE public.transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,                 -- Order within transcript
  speaker_label TEXT,                             -- 'Speaker 0', 'Speaker 1' or detected name
  start_time_ms INTEGER NOT NULL,                 -- Milliseconds from start
  end_time_ms INTEGER NOT NULL,
  text TEXT NOT NULL,                             -- The transcribed text
  language TEXT,                                  -- Detected language for this segment ('en', 'yue', 'cmn')
  confidence REAL,                                -- STT confidence score 0-1
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_segments_meeting_id ON public.transcript_segments(meeting_id);

-- ============================================================
-- AI-Generated Summaries
-- ============================================================
CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,

  -- Summary content (stored as JSON for flexibility)
  overview TEXT,                                  -- 1-2 sentence TL;DR
  overview_zh TEXT,                               -- Traditional Chinese TL;DR (bilingual)
  summary_text TEXT NOT NULL,                     -- Main summary paragraph(s)
  summary_text_zh TEXT,                           -- Traditional Chinese version (optional)
  key_points JSONB DEFAULT '[]',                  -- [{text, text_zh?}] — bullet list of main discussion points
  key_decisions JSONB DEFAULT '[]',               -- @deprecated — replaced by AI Recommendations
  action_items JSONB DEFAULT '[]',                -- [{text, text_zh, assignee, due_date, status}]
  key_quotes JSONB DEFAULT '[]',                  -- [{text, speaker, timestamp_ms}]
  topics JSONB DEFAULT '[]',                      -- [{name, name_zh}]
  sentiment TEXT,                                 -- 'positive', 'neutral', 'mixed', 'tense'

  -- AI metadata
  model_used TEXT,                                -- 'claude-sonnet-4-5-20250929'
  prompt_version TEXT,                            -- Track prompt iterations
  input_tokens INTEGER,
  output_tokens INTEGER,
  processing_time_ms INTEGER,

  -- User edits
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summaries_meeting_id ON public.summaries(meeting_id);

-- ============================================================
-- Speaker Mapping (user can name speakers after transcription)
-- ============================================================
CREATE TABLE public.speaker_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,                    -- Original label from STT ('Speaker 0')
  speaker_name TEXT NOT NULL,                     -- User-assigned name ('John')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, speaker_label)
);

-- ============================================================
-- Export History
-- ============================================================
CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,                      -- 'pdf', 'email', 'clipboard'
  export_language TEXT DEFAULT 'en',              -- 'en', 'zh-Hant', 'both'
  status TEXT DEFAULT 'pending',                  -- 'pending', 'completed', 'error'
  metadata JSONB,                                 -- Type-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 002_rls_policies.sql
-- ============================================================================

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Meetings policies
CREATE POLICY "Users can view own meetings"
  ON public.meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings"
  ON public.meetings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings"
  ON public.meetings FOR DELETE
  USING (auth.uid() = user_id);

-- Transcript segments policies
CREATE POLICY "Users can view own transcript segments"
  ON public.transcript_segments FOR SELECT
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own transcript segments"
  ON public.transcript_segments FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own transcript segments"
  ON public.transcript_segments FOR UPDATE
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own transcript segments"
  ON public.transcript_segments FOR DELETE
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

-- Summaries policies
CREATE POLICY "Users can view own summaries"
  ON public.summaries FOR SELECT
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own summaries"
  ON public.summaries FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own summaries"
  ON public.summaries FOR UPDATE
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own summaries"
  ON public.summaries FOR DELETE
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

-- Speaker mappings policies
CREATE POLICY "Users can view own speaker mappings"
  ON public.speaker_mappings FOR SELECT
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own speaker mappings"
  ON public.speaker_mappings FOR INSERT
  WITH CHECK (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own speaker mappings"
  ON public.speaker_mappings FOR UPDATE
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own speaker mappings"
  ON public.speaker_mappings FOR DELETE
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE user_id = auth.uid()));

-- Exports policies
CREATE POLICY "Users can view own exports"
  ON public.exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exports"
  ON public.exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exports"
  ON public.exports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exports"
  ON public.exports FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 003_storage_buckets.sql
-- ============================================================================

-- ============================================================
-- Storage Buckets
-- ============================================================

-- Create meeting-audio bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-audio',
  'meeting-audio',
  false,
  524288000, -- 500MB in bytes
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/x-m4a']
);

-- Storage policies for meeting-audio bucket
CREATE POLICY "Users can upload own audio files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'meeting-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own audio files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'meeting-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own audio files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'meeting-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own audio files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'meeting-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- 004_rpc_functions.sql
-- ============================================================================

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

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
  minutes_limit INTEGER DEFAULT 300,              -- Free tier: 300 min/month
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
  summary_text TEXT NOT NULL,                     -- Main summary paragraph(s)
  summary_text_zh TEXT,                           -- Traditional Chinese version (optional)
  key_decisions JSONB DEFAULT '[]',               -- [{text, text_zh, speaker, timestamp_ms}]
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
  export_type TEXT NOT NULL,                      -- 'pdf', 'notion', 'slack', 'email', 'clipboard'
  export_language TEXT DEFAULT 'en',              -- 'en', 'zh-Hant', 'both'
  status TEXT DEFAULT 'pending',                  -- 'pending', 'completed', 'error'
  metadata JSONB,                                 -- Type-specific data (e.g. Notion page ID)
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

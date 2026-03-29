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

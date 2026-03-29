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

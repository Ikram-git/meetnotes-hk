'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UploadDropzone } from '@/components/upload-dropzone';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in to upload.'); setUploading(false); return; }

      const userId = session.user.id;
      const fileId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'webm';
      const storagePath = `${userId}/${fileId}.${ext}`;

      // Upload directly to Supabase Storage (bypasses Vercel 4.5MB limit)
      let contentType = file.type;
      if (contentType === 'video/mp4') contentType = 'audio/mp4';
      if (contentType === 'video/webm') contentType = 'audio/webm';

      const { error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(storagePath, file, { contentType, upsert: false });

      if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setUploading(false); return; }

      // Create meeting record via API (small JSON payload, no size issue)
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          audio_storage_path: storagePath,
          audio_format: ext,
          audio_size_bytes: file.size,
          source: 'upload',
        }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Failed to create meeting.'); setUploading(false); return; }

      // Trigger transcription
      fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ meetingId: data.id }),
      }).catch(console.error);

      router.push(`/meetings/${data.id}`);
    } catch { setError('Upload failed. Please try again.'); setUploading(false); }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload Meeting</h1>
        <p className="text-sm text-gray-500 mt-1">Upload an audio recording to transcribe and summarise</p>
      </div>
      <div className="max-w-2xl">
        <UploadDropzone
          onFileSelected={(f) => { setFile(f); setError(null); }}
          file={file}
          onClear={() => setFile(null)}
          error={error}
        />
        {file && (
          <button onClick={handleUpload} disabled={uploading}
            className="mt-6 w-full bg-emerald-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-emerald-400 transition disabled:opacity-50 text-sm">
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Uploading & Processing...
              </span>
            ) : 'Upload & Transcribe'}
          </button>
        )}
      </div>
    </div>
  );
}

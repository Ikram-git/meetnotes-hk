'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UploadDropzone } from '@/components/upload-dropzone';
import { compressAudio } from '@/lib/compress-audio';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in to upload.'); setUploading(false); return; }

      // Compress if over 45MB
      let uploadFile = file;
      if (file.size > 45 * 1024 * 1024) {
        setStatus('Compressing audio...');
        try {
          uploadFile = await compressAudio(file, (p) => setStatus(`Compressing... ${p}%`));
        } catch (err) {
          console.error('Compression failed, uploading original:', err);
          uploadFile = file;
        }
      }

      setStatus('Uploading...');

      const userId = session.user.id;
      const fileId = crypto.randomUUID();
      const ext = uploadFile.name.split('.').pop() || 'webm';
      const storagePath = `${userId}/${fileId}.${ext}`;

      let contentType = uploadFile.type;
      if (contentType === 'video/mp4') contentType = 'audio/mp4';
      if (contentType === 'video/webm') contentType = 'audio/webm';

      // Get signed upload URL via API (uses service role)
      const signRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ storagePath, contentType }),
      });
      const signedData = await signRes.json();

      if (!signRes.ok || !signedData.signedUrl) {
        setError(`Upload failed: ${signedData.error || 'Could not create upload URL'}`);
        setUploading(false);
        return;
      }

      // Upload directly via signed URL
      const uploadRes = await fetch(signedData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: uploadFile,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        setError(`Upload failed: ${errText}`);
        setUploading(false);
        return;
      }

      setStatus('Processing...');

      // Create meeting record
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          audio_storage_path: storagePath,
          audio_format: ext,
          audio_size_bytes: uploadFile.size,
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
          <>
            {file.size > 45 * 1024 * 1024 && !uploading && (
              <p className="mt-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
                File is over 45MB — it will be automatically compressed to MP3 before uploading.
              </p>
            )}
            <button onClick={handleUpload} disabled={uploading}
              className="mt-4 w-full bg-emerald-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-emerald-400 transition disabled:opacity-50 text-sm">
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  {status || 'Uploading & Processing...'}
                </span>
              ) : 'Upload & Transcribe'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

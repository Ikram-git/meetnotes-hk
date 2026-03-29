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
      const formData = new FormData();
      formData.append('audio', file);
      const response = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Upload failed.'); setUploading(false); return; }
      router.push(`/meetings/${data.meetingId}`);
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

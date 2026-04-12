'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UploadDropzone } from '@/components/upload-dropzone';
import * as tus from 'tus-js-client';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '—';
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatEta(secs: number): string {
  if (!isFinite(secs) || secs <= 0) return '—';
  if (secs < 60) return `~${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return s === 0 ? `~${m}m` : `~${m}m ${s}s`;
}

interface UploadStats {
  bytesUploaded: number;
  bytesTotal: number;
  speedBytesPerSec: number;
  etaSeconds: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Throughput sampling — we keep a short rolling window so the MB/s reading
  // is responsive but not jumpy.
  const samplesRef = useRef<Array<{ t: number; bytes: number }>>([]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null); setProgress(0); setStats(null);
    samplesRef.current = [];
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in to upload.'); setUploading(false); return; }

      const userId = session.user.id;
      const fileId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'webm';
      const storagePath = `${userId}/${fileId}.${ext}`;

      let contentType = file.type;
      if (contentType === 'video/mp4') contentType = 'audio/mp4';
      if (contentType === 'video/webm') contentType = 'audio/webm';

      setStatus('Uploading...');

      // Use TUS resumable upload — handles any file size, uploads in chunks
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const uploadUrl = `${supabaseUrl}/storage/v1/upload/resumable`;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: uploadUrl,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 6 * 1024 * 1024, // 6MB chunks (Supabase's recommended size)
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'false',
          },
          metadata: {
            bucketName: 'meeting-audio',
            objectName: storagePath,
            contentType: contentType,
            cacheControl: '3600',
          },
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            setProgress(pct);

            // Rolling throughput over a ~3 second window
            const now = Date.now();
            samplesRef.current.push({ t: now, bytes: bytesUploaded });
            samplesRef.current = samplesRef.current.filter((s) => now - s.t <= 3000);

            let speed = 0;
            if (samplesRef.current.length >= 2) {
              const first = samplesRef.current[0];
              const last = samplesRef.current[samplesRef.current.length - 1];
              const dt = (last.t - first.t) / 1000;
              const db = last.bytes - first.bytes;
              if (dt > 0 && db > 0) speed = db / dt;
            }

            const remaining = speed > 0 ? (bytesTotal - bytesUploaded) / speed : Infinity;
            setStats({
              bytesUploaded,
              bytesTotal,
              speedBytesPerSec: speed,
              etaSeconds: remaining,
            });
            setStatus(`Uploading... ${pct}%`);
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      setStatus('Processing...');
      setStats(null);

      // Create meeting record
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setUploading(false);
    }
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
            {uploading && progress > 0 && (
              <div className="mt-4 bg-[#111916] border border-emerald-900/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">Uploading…</span>
                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">{progress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
                {stats ? (
                  <div className="flex items-center justify-between mt-2.5 text-xs text-gray-500 tabular-nums">
                    <span>
                      {formatBytes(stats.bytesUploaded)} / {formatBytes(stats.bytesTotal)}
                    </span>
                    <span className="text-emerald-400/80">
                      {formatSpeed(stats.speedBytesPerSec)}
                    </span>
                    <span>{formatEta(stats.etaSeconds)} left</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-2 text-center">{status}</p>
                )}
              </div>
            )}
            <button onClick={handleUpload} disabled={uploading}
              className="mt-4 w-full bg-emerald-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-emerald-400 transition disabled:opacity-50 text-sm">
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  {status || 'Uploading...'}
                </span>
              ) : 'Upload & Transcribe'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

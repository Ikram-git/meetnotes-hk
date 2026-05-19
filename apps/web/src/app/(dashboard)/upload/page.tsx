'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UploadDropzone } from '@/components/upload-dropzone';
import * as tus from 'tus-js-client';
import { isTauri } from '@/lib/tauri';
import { confirmDialog } from '@/components/confirm-dialog';
import { useAudioRecording } from '@/components/audio-recording-provider';

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

  const [desktopAvailable, setDesktopAvailable] = useState(false);
  const { recState, elapsed, recordingError, begin, finish, cancel } = useAudioRecording();

  useEffect(() => {
    const tauri = isTauri();
    setDesktopAvailable(tauri);
    if (!tauri) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('record') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      begin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Throughput sampling — we keep a short rolling window so the MB/s reading
  // is responsive but not jumpy.
  const samplesRef = useRef<Array<{ t: number; bytes: number }>>([]);

  const handleStopDesktopRecording = async () => {
    const recorded = await finish();
    if (recorded) {
      setFile(recorded);
      await handleUpload(recorded);
    }
  };

  const handleCancelDesktopRecording = async () => {
    const ok = await confirmDialog({
      title: 'Discard recording?',
      message:
        'This recording will be stopped and the audio thrown away — nothing will be uploaded or transcribed.',
      confirmLabel: 'Discard',
      variant: 'destructive',
    });
    if (!ok) return;
    await cancel();
  };

  const handleUpload = async (override?: File) => {
    const target = override ?? file;
    if (!target) return;
    setUploading(true); setError(null); setProgress(0); setStats(null);
    samplesRef.current = [];
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in to upload.'); setUploading(false); return; }

      const userId = session.user.id;
      const fileId = crypto.randomUUID();
      const ext = target.name.split('.').pop() || 'webm';
      const storagePath = `${userId}/${fileId}.${ext}`;

      let contentType = target.type;
      if (contentType === 'video/mp4') contentType = 'audio/mp4';
      if (contentType === 'video/webm') contentType = 'audio/webm';

      setStatus('Uploading...');

      // Use TUS resumable upload — handles any file size, uploads in chunks
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const uploadUrl = `${supabaseUrl}/storage/v1/upload/resumable`;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(target, {
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
          audio_size_bytes: target.size,
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
        {desktopAvailable && (
          <div className="mb-5 bg-[#111916] border border-emerald-900/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-sm font-semibold text-white">Record system audio</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Captures both sides of any meeting running on this computer. Desktop only.
                </p>
              </div>
              {recState === 'recording' && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="tabular-nums">
                    {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
                    {String(elapsed % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
            {recState === 'idle' && (
              <>
                <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>
                    <strong className="text-amber-100">Recording consent:</strong> ensure all
                    participants are aware this meeting is being recorded — local laws vary.
                  </span>
                </div>
                <button
                  onClick={() => begin()}
                  disabled={uploading}
                  className="mt-3 w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition"
                >
                  Start recording
                </button>
              </>
            )}
            {recState === 'recording' && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleCancelDesktopRecording}
                  className="flex-shrink-0 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-gray-800 hover:border-red-500/40 text-gray-300 hover:text-red-300 rounded-lg font-medium text-sm transition"
                  title="Discard this recording without uploading"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStopDesktopRecording}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition"
                >
                  Stop and upload
                </button>
              </div>
            )}
            {recState === 'finalizing' && (
              <button
                disabled
                className="mt-3 w-full bg-white/5 text-gray-400 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
              >
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Finalising recording…
              </button>
            )}
            {recordingError && (
              <p className="mt-2 text-xs text-red-400">{recordingError}</p>
            )}
          </div>
        )}
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
            <button onClick={() => handleUpload()} disabled={uploading}
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

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Modal } from './modal';
import * as tus from 'tus-js-client';

const ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/webm',
  'audio/x-m4a',
  'video/mp4',
];
const MAX_FILE_SIZE = 450 * 1024 * 1024;

type Stage = 'pick' | 'uploading' | 'processing' | 'done' | 'error';

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

export function UploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('pick');
  const [progress, setProgress] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(Infinity);
  const [error, setError] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const samplesRef = useRef<Array<{ t: number; bytes: number }>>([]);

  useEffect(() => {
    if (!open) return;
    if (stage === 'done' || stage === 'error') {
      setFile(null);
      setStage('pick');
      setProgress(0);
      setBytesUploaded(0);
      setBytesTotal(0);
      setSpeed(0);
      setEta(Infinity);
      setError(null);
      setMeetingId(null);
      samplesRef.current = [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const validateAndSet = (f: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported file type. Use MP3, WAV, M4A, WebM, or MP4.');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('File too large. Max is 450MB.');
      return;
    }
    setFile(f);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSet(e.dataTransfer.files[0]);
  };

  const startUpload = async () => {
    if (!file) return;
    setStage('uploading');
    setError(null);
    samplesRef.current = [];

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to upload.');
        setStage('error');
        return;
      }

      const userId = session.user.id;
      const fileId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'webm';
      const storagePath = `${userId}/${fileId}.${ext}`;

      let contentType = file.type;
      if (contentType === 'video/mp4') contentType = 'audio/mp4';
      if (contentType === 'video/webm') contentType = 'audio/webm';

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const uploadUrl = `${supabaseUrl}/storage/v1/upload/resumable`;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: uploadUrl,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 6 * 1024 * 1024,
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'false',
          },
          metadata: {
            bucketName: 'meeting-audio',
            objectName: storagePath,
            contentType,
            cacheControl: '3600',
          },
          onError: (err) => reject(err),
          onProgress: (uploaded, total) => {
            const pct = Math.round((uploaded / total) * 100);
            setProgress(pct);
            setBytesUploaded(uploaded);
            setBytesTotal(total);

            const now = Date.now();
            samplesRef.current.push({ t: now, bytes: uploaded });
            samplesRef.current = samplesRef.current.filter((s) => now - s.t <= 3000);

            let s = 0;
            if (samplesRef.current.length >= 2) {
              const first = samplesRef.current[0];
              const last = samplesRef.current[samplesRef.current.length - 1];
              const dt = (last.t - first.t) / 1000;
              const db = last.bytes - first.bytes;
              if (dt > 0 && db > 0) s = db / dt;
            }
            setSpeed(s);
            setEta(s > 0 ? (total - uploaded) / s : Infinity);
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      setStage('processing');

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          audio_storage_path: storagePath,
          audio_format: ext,
          audio_size_bytes: file.size,
          source: 'upload',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to create meeting.');
        setStage('error');
        return;
      }

      fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ meetingId: data.id }),
      }).catch(console.error);

      setMeetingId(data.id);
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setStage('error');
    }
  };

  const handleClose = () => {
    if (stage === 'uploading') return;
    onClose();
  };

  const goToMeeting = () => {
    if (!meetingId) return;
    router.push(`/meetings/${meetingId}`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New meeting"
      closeOnBackdrop={stage !== 'uploading'}
    >
      <div className="p-5">
        {stage === 'pick' && (
          <>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : file
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-gray-800 hover:border-gray-700 bg-white/[0.02]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !file && document.getElementById('upload-dialog-input')?.click()}
            >
              {file ? (
                <div>
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-medium text-white truncate px-4">{file.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{formatBytes(file.size)}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm text-gray-400">
                    Drop audio file here or{' '}
                    <span className="text-emerald-400 font-semibold">browse</span>
                  </p>
                  <p className="mt-1 text-[11px] text-gray-600">MP3, WAV, M4A, MP4, WebM · max 450 MB</p>
                </div>
              )}
              <input
                id="upload-dialog-input"
                type="file"
                className="hidden"
                accept=".mp3,.wav,.m4a,.webm,.mp4"
                onChange={(e) => e.target.files?.[0] && validateAndSet(e.target.files[0])}
              />
            </div>

            {error && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}

            <button
              onClick={startUpload}
              disabled={!file}
              className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition"
            >
              Upload &amp; transcribe
            </button>
          </>
        )}

        {(stage === 'uploading' || stage === 'processing') && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-white truncate pr-2">{file?.name}</span>
                <span className="text-sm font-semibold text-emerald-400 tabular-nums">{progress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-500 tabular-nums">
                <span>{formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)}</span>
                <span className="text-emerald-400/80">{formatSpeed(speed)}</span>
                <span>{formatEta(eta)} left</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              {stage === 'uploading'
                ? 'Uploading… you can keep working in another tab.'
                : 'Creating meeting record…'}
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-3 text-base font-semibold text-white">Upload complete</h3>
            <p className="mt-1 text-xs text-gray-500">
              Transcription is running in the background — usually takes 30–60 seconds.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-sm font-medium transition"
              >
                Stay here
              </button>
              <button
                onClick={goToMeeting}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                Open meeting →
              </button>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center py-2">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Upload failed</h3>
            <p className="mt-1 text-xs text-red-400 px-4">{error}</p>
            <button
              onClick={() => {
                setStage('pick');
                setError(null);
              }}
              className="mt-4 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

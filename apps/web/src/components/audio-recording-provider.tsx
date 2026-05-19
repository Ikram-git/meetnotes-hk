'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  isTauri,
  isRecordingActive,
  readRecordingBytes,
  startRecording as tauriStartRecording,
  stopRecording as tauriStopRecording,
} from '@/lib/tauri';

const STARTED_AT_KEY = 'briva_recording_started_at';

export type RecState = 'idle' | 'recording' | 'finalizing';

type AudioRecordingContextValue = {
  recState: RecState;
  elapsed: number;
  recordingError: string | null;
  /** Start a system-audio recording. Idempotent — adopts an already-running one. */
  begin: () => Promise<boolean>;
  /** Stop, read the WAV off disk, and return it as a File (null on error). */
  finish: () => Promise<File | null>;
  /** Stop and throw the audio away. */
  cancel: () => Promise<void>;
};

const AudioRecordingContext = createContext<AudioRecordingContextValue | null>(null);

export function AudioRecordingProvider({ children }: { children: ReactNode }) {
  const [recState, setRecState] = useState<RecState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const startedAtRef = useRef<number>(0);

  // Recover after a hard app reload: the Rust process keeps recording even
  // though the webview reloaded, so adopt that state if it's still going.
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    isRecordingActive()
      .then((active) => {
        if (cancelled || !active) return;
        const stored = Number(localStorage.getItem(STARTED_AT_KEY));
        startedAtRef.current = stored > 0 ? stored : Date.now();
        setRecState((s) => (s === 'idle' ? 'recording' : s));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Elapsed timer lives here so it keeps ticking across page navigation.
  useEffect(() => {
    if (recState !== 'recording') return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [recState]);

  const begin = useCallback(async () => {
    setRecordingError(null);
    try {
      // If a recording is already running (started before a navigation),
      // just adopt it rather than asking Rust to start a second one.
      if (await isRecordingActive()) {
        const stored = Number(localStorage.getItem(STARTED_AT_KEY));
        startedAtRef.current = stored > 0 ? stored : Date.now();
        setRecState('recording');
        return true;
      }
      await tauriStartRecording();
      startedAtRef.current = Date.now();
      try {
        localStorage.setItem(STARTED_AT_KEY, String(startedAtRef.current));
      } catch {}
      setElapsed(0);
      setRecState('recording');
      return true;
    } catch (err) {
      setRecordingError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, []);

  const finish = useCallback(async () => {
    setRecState('finalizing');
    try {
      const path = await tauriStopRecording();
      const bytes = await readRecordingBytes(path);
      const name = path.split(/[\\/]/).pop() || `meeting-${Date.now()}.wav`;
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' });
      const file = new File([blob], name, { type: 'audio/wav' });
      try {
        localStorage.removeItem(STARTED_AT_KEY);
      } catch {}
      setRecState('idle');
      setElapsed(0);
      return file;
    } catch (err) {
      try {
        localStorage.removeItem(STARTED_AT_KEY);
      } catch {}
      setRecState('idle');
      setElapsed(0);
      setRecordingError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const cancel = useCallback(async () => {
    try {
      await tauriStopRecording();
    } catch {
      // Ignore — we're discarding anyway.
    }
    try {
      localStorage.removeItem(STARTED_AT_KEY);
    } catch {}
    setRecState('idle');
    setElapsed(0);
    setRecordingError(null);
  }, []);

  return (
    <AudioRecordingContext.Provider
      value={{ recState, elapsed, recordingError, begin, finish, cancel }}
    >
      {children}
      <AudioRecordingPill />
    </AudioRecordingContext.Provider>
  );
}

export function useAudioRecording(): AudioRecordingContextValue {
  const ctx = useContext(AudioRecordingContext);
  if (!ctx) {
    throw new Error('useAudioRecording must be used within an AudioRecordingProvider');
  }
  return ctx;
}

/**
 * Floating indicator shown on every dashboard page (except /upload itself)
 * while a system-audio recording is running — so the user always knows it's
 * still going and can jump back to the recorder to stop & upload it.
 */
function AudioRecordingPill() {
  const ctx = useContext(AudioRecordingContext);
  const pathname = usePathname();

  if (!ctx) return null;
  if (ctx.recState === 'idle') return null;
  if (pathname === '/upload') return null;

  const mm = String(Math.floor(ctx.elapsed / 60)).padStart(2, '0');
  const ss = String(ctx.elapsed % 60).padStart(2, '0');
  const label = ctx.recState === 'finalizing' ? 'Finalising…' : `${mm}:${ss}`;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-xl border border-red-500/40 bg-[#111916] px-4 py-2.5 shadow-xl shadow-black/40">
      <span className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-semibold text-white">Recording</span>
      </span>
      <span className="text-xs font-medium text-red-300 tabular-nums">{label}</span>
      <Link
        href="/upload"
        className="text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 rounded-lg transition"
      >
        Open recorder
      </Link>
    </div>
  );
}

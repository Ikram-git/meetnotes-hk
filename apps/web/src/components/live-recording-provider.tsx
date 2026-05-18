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
import { usePathname, useRouter } from 'next/navigation';
import {
  startLiveCapture,
  stopLiveCapture,
  onTranscript,
  onTranscriptError,
  onTranscriptReady,
  type LiveCaptureFormat,
} from '@/lib/tauri';
import { createClient } from '@/lib/supabase/client';

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'stopping' | 'error';

export interface TranscriptLine {
  id: string;
  text: string;
  final: boolean;
  startMs: number;
  endMs: number;
  speaker: string;
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

type LiveRecordingContextValue = {
  status: LiveStatus;
  error: string | null;
  format: LiveCaptureFormat | null;
  lines: TranscriptLine[];
  interim: string;
  elapsed: number;
  saving: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  stopAndSave: (chat?: ChatTurn[]) => Promise<void>;
};

const LiveRecordingContext = createContext<LiveRecordingContextValue | null>(null);

export function LiveRecordingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [status, setStatus] = useState<LiveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<LiveCaptureFormat | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);

  const unlistenTranscriptRef = useRef<(() => void) | null>(null);
  const unlistenErrorRef = useRef<(() => void) | null>(null);
  const unlistenReadyRef = useRef<(() => void) | null>(null);
  const startedAtRef = useRef<number>(0);

  // Elapsed timer lives here (not on the page) so it keeps ticking when the
  // user navigates away from /record-live while the meeting is still live.
  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  // Warn before a hard window close / refresh while a meeting is live —
  // navigating between dashboard pages is safe (state lives in this provider),
  // but a full reload would drop it.
  useEffect(() => {
    if (status !== 'connecting' && status !== 'live' && status !== 'stopping') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  const teardownCapture = useCallback(async () => {
    try {
      await stopLiveCapture();
    } catch (err) {
      console.error('[live] stop capture failed', err);
    }
    unlistenTranscriptRef.current?.();
    unlistenTranscriptRef.current = null;
    unlistenErrorRef.current?.();
    unlistenErrorRef.current = null;
    unlistenReadyRef.current?.();
    unlistenReadyRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setLines([]);
    setInterim('');
    setStatus('connecting');
    try {
      const tokenRes = await fetch('/api/deepgram/token');
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(err.error || 'Could not mint Deepgram token');
      }
      const { token } = await tokenRes.json();

      unlistenTranscriptRef.current = await onTranscript((raw) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.type !== 'Results') return;
          const alt = msg.channel?.alternatives?.[0];
          const text = (alt?.transcript || '').trim();
          if (!text) return;
          const startMs = Math.round((msg.start ?? 0) * 1000);
          const endMs = Math.round(((msg.start ?? 0) + (msg.duration ?? 0)) * 1000);
          const words: Array<{ speaker?: number }> = alt?.words || [];
          const speakerNum = words[0]?.speaker ?? 0;
          const speaker = `Speaker ${speakerNum}`;
          if (msg.is_final) {
            setLines((prev) => [
              ...prev,
              { id: crypto.randomUUID(), text, final: true, startMs, endMs, speaker },
            ]);
            setInterim('');
          } else {
            setInterim(text);
          }
        } catch {}
      });

      unlistenErrorRef.current = await onTranscriptError((message) => {
        setError(message);
        setStatus('error');
      });

      unlistenReadyRef.current = await onTranscriptReady(() => {
        startedAtRef.current = Date.now();
        setStatus('live');
      });

      const fmt = await startLiveCapture(token);
      setFormat(fmt);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      try {
        await stopLiveCapture();
      } catch {}
    }
  }, []);

  const stop = useCallback(async () => {
    setStatus('stopping');
    await teardownCapture();
    setStatus('idle');
    setInterim('');
    setElapsed(0);
  }, [teardownCapture]);

  const stopAndSave = useCallback(
    async (chat: ChatTurn[] = []) => {
      if (lines.length === 0) {
        setError('No transcript captured yet — keep talking before saving.');
        return;
      }
      setStatus('stopping');
      const capturedLines = lines;
      const durationSeconds = elapsed;
      await teardownCapture();
      setSaving(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch('/api/meetings/finalise-live', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            lines: capturedLines.map((l) => ({
              text: l.text,
              startMs: l.startMs,
              endMs: l.endMs,
              speaker: l.speaker,
            })),
            chat: chat.filter((m) => m.content.trim()),
            durationSeconds,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.meetingId) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setSaving(false);
        setStatus('idle');
        setInterim('');
        setElapsed(0);
        setLines([]);
        router.push(`/meetings/${data.meetingId}`);
      } catch (err) {
        setSaving(false);
        setStatus('idle');
        setInterim('');
        setElapsed(0);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [lines, elapsed, teardownCapture, router],
  );

  // Only runs when the provider itself unmounts — i.e. the user leaves the
  // whole dashboard (sign out / homepage). Intra-dashboard navigation keeps
  // the provider mounted, so the recording survives.
  useEffect(() => {
    return () => {
      unlistenTranscriptRef.current?.();
      unlistenErrorRef.current?.();
      unlistenReadyRef.current?.();
      stopLiveCapture().catch(() => {});
    };
  }, []);

  return (
    <LiveRecordingContext.Provider
      value={{ status, error, format, lines, interim, elapsed, saving, start, stop, stopAndSave }}
    >
      {children}
      <LiveRecordingPill />
    </LiveRecordingContext.Provider>
  );
}

export function useLiveRecording(): LiveRecordingContextValue {
  const ctx = useContext(LiveRecordingContext);
  if (!ctx) {
    throw new Error('useLiveRecording must be used within a LiveRecordingProvider');
  }
  return ctx;
}

/**
 * Floating indicator shown on every dashboard page (except /record-live
 * itself) while a live meeting is running — so the user always knows the
 * recording is still going and can jump back or stop it from anywhere.
 */
function LiveRecordingPill() {
  const ctx = useContext(LiveRecordingContext);
  const pathname = usePathname();

  if (!ctx) return null;
  if (ctx.status === 'idle' || ctx.status === 'error') return null;
  if (pathname === '/record-live') return null;

  const mm = String(Math.floor(ctx.elapsed / 60)).padStart(2, '0');
  const ss = String(ctx.elapsed % 60).padStart(2, '0');
  const busy = ctx.status === 'stopping' || ctx.saving;
  const label =
    ctx.status === 'connecting' ? 'Connecting…' : busy ? 'Saving…' : `${mm}:${ss}`;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-[#111916] px-4 py-2.5 shadow-xl shadow-black/40">
      <span className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-semibold text-white">Live meeting</span>
      </span>
      <span className="text-xs font-medium text-emerald-300 tabular-nums">{label}</span>
      <Link
        href="/record-live"
        className="text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition"
      >
        Open
      </Link>
      <button
        onClick={() => ctx.stopAndSave()}
        disabled={busy}
        className="text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
      >
        Stop &amp; save
      </button>
    </div>
  );
}

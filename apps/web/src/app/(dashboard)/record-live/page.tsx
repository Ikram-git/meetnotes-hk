'use client';

import { useEffect, useRef, useState } from 'react';
import {
  isTauri,
  startLiveCapture,
  stopLiveCapture,
  onTranscript,
  onTranscriptError,
  onTranscriptReady,
  type LiveCaptureFormat,
} from '@/lib/tauri';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Status = 'idle' | 'connecting' | 'live' | 'stopping' | 'error';

interface TranscriptLine {
  id: string;
  text: string;
  final: boolean;
  startMs: number;
  endMs: number;
  speaker: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export default function RecordLivePage() {
  const [desktop, setDesktop] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<LiveCaptureFormat | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const unlistenTranscriptRef = useRef<(() => void) | null>(null);
  const unlistenErrorRef = useRef<(() => void) | null>(null);
  const unlistenReadyRef = useRef<(() => void) | null>(null);
  const startedAtRef = useRef<number>(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setDesktop(isTauri());
  }, []);

  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat]);

  useEffect(() => {
    transcriptScrollRef.current?.scrollTo({
      top: transcriptScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [lines, interim]);

  const start = async () => {
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
  };

  const teardownCapture = async () => {
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
  };

  const stop = async () => {
    setStatus('stopping');
    await teardownCapture();
    setStatus('idle');
    setInterim('');
    setElapsed(0);
  };

  const stopAndSave = async () => {
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
          chat: chat
            .filter((m) => m.content.trim() && !m.streaming)
            .map((m) => ({ role: m.role, content: m.content })),
          durationSeconds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.meetingId) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      router.push(`/meetings/${data.meetingId}`);
    } catch (err) {
      setSaving(false);
      setStatus('idle');
      setInterim('');
      setElapsed(0);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setQuestion('');
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: q };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      streaming: true,
    };
    const priorHistory = chat.map((m) => ({ role: m.role, content: m.content }));
    setChat((prev) => [...prev, userMsg, assistantMsg]);
    setAsking(true);

    const transcript = lines.map((l) => l.text).join(' ');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ transcript, question: q, history: priorHistory }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setChat((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m)),
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setChat((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: `[Error: ${msg}]`, streaming: false } : m,
        ),
      );
    } finally {
      setChat((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, streaming: false } : m)));
      setAsking(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      unlistenTranscriptRef.current?.();
      unlistenErrorRef.current?.();
      unlistenReadyRef.current?.();
      if (abortRef.current) abortRef.current.abort();
      stopLiveCapture().catch(() => {});
    };
  }, []);

  if (!desktop) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Live Recording</h1>
        <p className="text-sm text-gray-400">
          Live transcription is only available in the Briva desktop app.
        </p>
      </div>
    );
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Meeting</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            System audio transcribed live. Ask AI questions on the right.
          </p>
        </div>
        {status === 'idle' && (
          <div className="hidden md:flex items-start gap-2 max-w-md px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>
              <strong className="text-amber-100">Recording consent:</strong> ensure all
              participants are aware this meeting is being recorded — local laws vary.
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {status === 'live' && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm tabular-nums">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {mm}:{ss}
            </div>
          )}
          {status === 'idle' || status === 'error' ? (
            <button
              onClick={start}
              className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              Start live
            </button>
          ) : null}
          {status === 'connecting' && (
            <button disabled className="bg-white/5 text-gray-400 px-4 py-2 rounded-lg text-sm">
              Connecting…
            </button>
          )}
          {(status === 'live' || status === 'stopping') && (
            <>
              <button
                onClick={stop}
                disabled={status === 'stopping' || saving}
                className="bg-white/10 hover:bg-white/15 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                title="Stop without saving"
              >
                {status === 'stopping' && !saving ? 'Stopping…' : 'Discard'}
              </button>
              <button
                onClick={stopAndSave}
                disabled={status === 'stopping' || saving || lines.length === 0}
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                title="Stop, save transcript, and summarise"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Summarising…
                  </>
                ) : (
                  'Stop & Save'
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 flex-shrink-0">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 flex-1 min-h-0">
        {/* Transcript column */}
        <div className="bg-[#111916] border border-emerald-900/30 rounded-xl flex flex-col min-h-0">
          <div className="px-5 py-3 border-b border-emerald-900/20 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Transcript
            </h2>
            {format && (
              <span className="text-[10px] text-gray-600 tabular-nums">
                {format.sample_rate / 1000} kHz · {format.channels}ch
              </span>
            )}
          </div>
          <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto p-5">
            {lines.length === 0 && !interim && status !== 'live' && (
              <p className="text-gray-500 text-sm">
                Click <span className="text-emerald-400">Start live</span> and play or speak — the
                transcript will appear here in real time.
              </p>
            )}
            {lines.length === 0 && !interim && status === 'live' && (
              <p className="text-gray-500 text-sm italic">Listening…</p>
            )}
            {lines.map((l, idx) => {
              const prev = idx > 0 ? lines[idx - 1] : null;
              const showSpeaker = !prev || prev.speaker !== l.speaker;
              return (
                <div key={l.id} className="mb-2">
                  {showSpeaker && (
                    <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-0.5">
                      {l.speaker}
                    </div>
                  )}
                  <p className="text-white text-sm leading-relaxed">{l.text}</p>
                </div>
              );
            })}
            {interim && <p className="text-gray-500 text-sm italic leading-relaxed">{interim}</p>}
          </div>
        </div>

        {/* Chat column */}
        <div className="bg-[#111916] border border-purple-900/30 rounded-xl flex flex-col min-h-0">
          <div className="px-5 py-3 border-b border-purple-900/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Ask AI about this meeting
            </h2>
          </div>
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {chat.length === 0 && (
              <div className="text-gray-500 text-sm space-y-2">
                <p>Ask anything about what&apos;s being said:</p>
                <ul className="text-xs space-y-1 pl-4 list-disc text-gray-600">
                  <li>&quot;What was the decision on X?&quot;</li>
                  <li>&quot;Who is responsible for Y?&quot;</li>
                  <li>&quot;Summarise the last 5 minutes&quot;</li>
                  <li>&quot;Did they commit to a deadline?&quot;</li>
                </ul>
              </div>
            )}
            {chat.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === 'user'
                    ? 'bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-sm text-white'
                    : 'text-sm text-gray-200 leading-relaxed'
                }
              >
                {m.role === 'assistant' && (
                  <div className="text-[10px] font-semibold text-purple-400 mb-1 uppercase tracking-wide">
                    Briva AI
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.streaming && (
                  <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-pulse" />
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
            className="p-3 border-t border-purple-900/20"
          >
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about the meeting…"
                disabled={asking}
                className="flex-1 bg-[#0a0f0d] border border-purple-900/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                {asking ? '…' : 'Ask'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

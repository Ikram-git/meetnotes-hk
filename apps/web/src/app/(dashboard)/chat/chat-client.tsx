'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Citation {
  index: number;
  meeting_id: string;
  meeting_title: string;
  meeting_created_at: string;
  start_ms: number | null;
  snippet: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  error?: string;
}

const SUGGESTIONS = [
  'Summarise our most recent meeting',
  'List every action item assigned to me',
  'When did we last talk about pricing?',
  'What did we decide last week?',
];

export function ChatClient({
  threadId,
  onThreadCreated,
  onActivity,
}: {
  threadId: string | null;
  onThreadCreated: (id: string) => void;
  onActivity: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{
    completed_meetings: number;
    indexed_chunks: number;
  } | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat-status (meetings vs indexed chunks) once per mount
  useEffect(() => {
    fetch('/api/workspace-chat/index')
      .then((r) => r.json())
      .then((d) => setIndexStatus(d))
      .catch(() => {});
  }, []);

  // Load thread messages when threadId changes
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    fetch(`/api/workspace-chat/threads/${threadId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const loaded: Message[] = (d.messages ?? []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations ?? undefined,
        }));
        setMessages(loaded);
      })
      .finally(() => !cancelled && setLoadingThread(false));
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const runBackfill = async () => {
    setIndexing(true);
    setIndexResult(null);
    try {
      const res = await fetch('/api/workspace-chat/index', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setIndexResult(data.error || 'Indexing failed');
      } else {
        const reasons = (data.failure_reasons || []) as string[];
        setIndexResult(
          `Indexed ${data.indexed} meeting${data.indexed === 1 ? '' : 's'}` +
            (data.failed ? `, ${data.failed} failed` : '') +
            (reasons.length ? ` — first error: ${reasons[0]}` : '') +
            '. Chat is ready.',
        );
        fetch('/api/workspace-chat/index')
          .then((r) => r.json())
          .then((d) => setIndexStatus(d))
          .catch(() => {});
      }
    } finally {
      setIndexing(false);
    }
  };

  const needsBackfill =
    indexStatus &&
    indexStatus.completed_meetings > 0 &&
    indexStatus.indexed_chunks === 0;

  const send = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
    };
    const placeholderMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    };
    setMessages((m) => [...m, userMsg, placeholderMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/workspace-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), history, threadId }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id
              ? { ...msg, content: '', error: error || 'Something went wrong' }
              : msg,
          ),
        );
        return;
      }

      // Streaming response: first line is JSON metadata
      // {threadId, citations}, the rest is the answer text streaming.
      if (!res.body) throw new Error('Empty response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let metadataParsed = false;
      let metadataCitations: Citation[] = [];
      let metadataThreadId: string | null = null;
      let answer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!metadataParsed) {
          buffer += chunk;
          const newlineIdx = buffer.indexOf('\n');
          if (newlineIdx >= 0) {
            const metaLine = buffer.slice(0, newlineIdx);
            try {
              const meta = JSON.parse(metaLine) as {
                threadId?: string | null;
                citations?: Citation[];
              };
              metadataCitations = meta.citations ?? [];
              metadataThreadId = meta.threadId ?? null;
            } catch {
              /* ignore */
            }
            metadataParsed = true;
            answer += buffer.slice(newlineIdx + 1);
            buffer = '';
            // Render any text that came after the metadata in the same chunk
            const a0 = answer;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === placeholderMsg.id
                  ? { ...msg, content: a0, citations: metadataCitations }
                  : msg,
              ),
            );
          }
        } else {
          answer += chunk;
          const a = answer;
          setMessages((m) =>
            m.map((msg) =>
              msg.id === placeholderMsg.id
                ? { ...msg, content: a, citations: metadataCitations }
                : msg,
            ),
          );
        }
      }

      if (!threadId && metadataThreadId) {
        onThreadCreated(metadataThreadId);
      } else {
        onActivity();
      }
    } catch (err) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === placeholderMsg.id
            ? { ...msg, content: '', error: err instanceof Error ? err.message : 'Failed' }
            : msg,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex flex-col bg-[#111916] border border-purple-900/30 rounded-2xl overflow-hidden">
      {needsBackfill && (
        <div className="px-5 py-3 border-b border-emerald-900/20 bg-emerald-500/[0.04] flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-emerald-300 font-semibold">
              Index your past meetings to enable cross-meeting chat.
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {indexStatus.completed_meetings} meeting
              {indexStatus.completed_meetings === 1 ? '' : 's'} ready to embed. New meetings index automatically.
            </p>
          </div>
          <button
            onClick={runBackfill}
            disabled={indexing}
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-md font-medium transition disabled:opacity-50"
          >
            {indexing ? 'Indexing…' : 'Index now'}
          </button>
        </div>
      )}
      {indexResult && (
        <div className="px-5 py-2 border-b border-emerald-900/20 text-xs text-emerald-300 bg-emerald-500/[0.04]">
          {indexResult}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        {loadingThread ? (
          <div className="space-y-4">
            <div className="skeleton-shimmer h-12 rounded-2xl ml-auto w-2/3" />
            <div className="skeleton-shimmer h-20 rounded-2xl w-3/4" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-10 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-300 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-purple-400">BRIVA AI</h2>
            <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto">
              Ask anything about your meetings. Briva searches every transcript in this workspace and answers with citations.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs text-gray-300 bg-white/5 hover:bg-white/10 border border-purple-900/30 px-3 py-1.5 rounded-full transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                loading={
                  loading &&
                  m === messages[messages.length - 1] &&
                  m.role === 'assistant' &&
                  !m.content
                }
              />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-purple-900/20 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about any meeting in this workspace…"
          disabled={loading || loadingThread}
          className="flex-1 px-3.5 py-2.5 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || loadingThread || !input.trim()}
          className="px-4 py-2.5 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>
    </div>
  );
}

function ChatMessage({ message, loading }: { message: Message; loading: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-purple-500/15 border border-purple-500/30 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[11px] font-bold mt-0.5">
        B
      </div>
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="flex gap-1 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-pulse [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-pulse [animation-delay:0.3s]" />
          </div>
        ) : message.error ? (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {message.error}
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {renderWithCitations(message.content, message.citations || [])}
            </div>
            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Sources</div>
                <div className="flex flex-wrap gap-1.5">
                  {message.citations.map((c) => (
                    <Link
                      key={c.index}
                      href={`/meetings/${c.meeting_id}${c.start_ms ? `?t=${Math.floor(c.start_ms / 1000)}` : ''}`}
                      className="text-[11px] text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full transition"
                      title={c.snippet}
                    >
                      [{c.index}] {c.meeting_title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function renderWithCitations(text: string, citations: Citation[]): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[#?(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let nodeIdx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${nodeIdx++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    const idx = parseInt(match[1], 10);
    const cite = citations.find((c) => c.index === idx);
    if (cite) {
      parts.push(
        <Link
          key={`c-${nodeIdx++}`}
          href={`/meetings/${cite.meeting_id}${cite.start_ms ? `?t=${Math.floor(cite.start_ms / 1000)}` : ''}`}
          className="inline-flex items-center px-1.5 mx-0.5 text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 rounded hover:bg-purple-500/25 align-baseline"
          title={cite.snippet}
        >
          {idx}
        </Link>,
      );
    } else {
      parts.push(<span key={`t-${nodeIdx++}`}>{match[0]}</span>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`t-${nodeIdx++}`}>{text.slice(lastIndex)}</span>);
  }
  return parts;
}

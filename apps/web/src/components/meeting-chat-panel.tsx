'use client';

import { useEffect, useRef, useState } from 'react';
import { friendlyErrorMessage } from '@/lib/errors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  error?: string;
}

const SUGGESTIONS = [
  'What were the key decisions?',
  'List every action item',
  'Who said what about [topic]?',
  'Was there any disagreement?',
];

export function MeetingChatPanel({ meetingId }: { meetingId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/meetings/${meetingId}/chat`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const msgs: Message[] = (d.messages ?? []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }));
        setMessages(msgs);
      })
      .finally(() => !cancelled && setHistoryLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question.trim() };
    const placeholder: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      pending: true,
    };
    setMessages((m) => [...m, userMsg, placeholder]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`/api/meetings/${meetingId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), history }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholder.id
              ? { ...msg, content: '', error: friendlyErrorMessage(error), pending: false }
              : msg,
          ),
        );
        return;
      }
      // Streaming: first line is JSON metadata (empty for per-meeting),
      // rest is the answer text streaming token-by-token.
      if (!res.body) throw new Error('Empty response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let metadataParsed = false;
      let answer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const piece = decoder.decode(value, { stream: true });
        if (!metadataParsed) {
          buffer += piece;
          const nl = buffer.indexOf('\n');
          if (nl >= 0) {
            metadataParsed = true;
            answer += buffer.slice(nl + 1);
            buffer = '';
            const a = answer;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === placeholder.id ? { ...msg, content: a, pending: false } : msg,
              ),
            );
          }
        } else {
          answer += piece;
          const a = answer;
          setMessages((m) =>
            m.map((msg) =>
              msg.id === placeholder.id ? { ...msg, content: a, pending: false } : msg,
            ),
          );
        }
      }
    } catch (err) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === placeholder.id
            ? {
                ...msg,
                content: '',
                error: friendlyErrorMessage(err),
                pending: false,
              }
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
    <div className="flex flex-col h-full min-h-[480px]">
      {/* Header sits ABOVE the card so its baseline aligns with the
          tab strip on the left column. Purple = the live-AI brand colour. */}
      <div className="flex items-center gap-2 px-1 pb-2 mb-4 border-b border-purple-900/30 h-[42px]">
        <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center text-[11px] font-bold">
          B
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider leading-tight">BRIVA AI</div>
          <div className="text-[10px] text-gray-500 leading-tight">Ask about this meeting · shared with your workspace</div>
        </div>
      </div>

      <div className="bg-[#111916] rounded-xl border border-purple-900/30 flex flex-col overflow-hidden flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {!historyLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-6">
            <p className="text-xs text-gray-500 max-w-[260px] mx-auto">
              Ask anything about this meeting. Briva uses the full transcript and summary to answer.
            </p>
            <div className="mt-5 flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs text-left text-gray-300 bg-white/5 hover:bg-white/10 border border-purple-900/30 px-3 py-1.5 rounded-md transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-purple-900/20 p-2.5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this meeting…"
          disabled={loading}
          className="flex-1 px-3 py-2 bg-white/5 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </form>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-purple-500/15 border border-purple-500/30 text-white rounded-xl rounded-tr-sm px-3 py-2 text-xs">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold mt-0.5">
        B
      </div>
      <div className="flex-1 min-w-0">
        {message.pending ? (
          <div className="flex gap-1 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-pulse [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-pulse [animation-delay:0.3s]" />
          </div>
        ) : message.error ? (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
            {message.error}
          </div>
        ) : (
          <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </div>
  );
}

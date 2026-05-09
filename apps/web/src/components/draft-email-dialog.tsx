'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from './modal';
import { useToast } from './toast';
import { friendlyErrorMessage } from '@/lib/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DraftEmailDialog({
  open,
  onClose,
  meetingId,
}: {
  open: boolean;
  onClose: () => void;
  meetingId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setSubject('');
      setBody('');
      setRecipients([]);
      setRecipientInput('');
      setError(null);
      setLoading(false);
      setStreaming(false);
      setSending(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setStreaming(true);
    setError(null);
    setSubject('');
    setBody('');
    setRecipients([]);

    (async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/draft-email`, {
          method: 'POST',
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let metadataParsed = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) return;
          buffer += decoder.decode(value, { stream: true });

          if (!metadataParsed) {
            const newlineIdx = buffer.indexOf('\n');
            if (newlineIdx === -1) continue;
            const metaLine = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            try {
              const meta = JSON.parse(metaLine) as {
                subject?: string;
                recipients?: string[];
              };
              if (meta.subject) setSubject(meta.subject);
              if (Array.isArray(meta.recipients)) setRecipients(meta.recipients);
            } catch {
              // No metadata — treat the whole thing as body
              buffer = metaLine + '\n' + buffer;
            }
            metadataParsed = true;
            setLoading(false);
          }

          if (metadataParsed && buffer) {
            const chunk = buffer;
            buffer = '';
            setBody((prev) => prev + chunk);
          }
        }
        if (!cancelled) setStreaming(false);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setError(friendlyErrorMessage(err, "Couldn't draft the email. Please try again."));
        setLoading(false);
        setStreaming(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [open, meetingId]);

  const addRecipient = (raw: string) => {
    const candidate = raw.trim().toLowerCase().replace(/[,;]+$/, '');
    if (!candidate) return;
    if (!EMAIL_RE.test(candidate)) {
      toast(`"${candidate}" doesn't look like an email`, 'error');
      return;
    }
    if (recipients.includes(candidate)) return;
    setRecipients((prev) => [...prev, candidate]);
  };

  const removeRecipient = (e: string) => {
    setRecipients((prev) => prev.filter((x) => x !== e));
  };

  const handleRecipientKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') {
      if (recipientInput.trim()) {
        e.preventDefault();
        addRecipient(recipientInput);
        setRecipientInput('');
      }
    } else if (e.key === 'Backspace' && !recipientInput && recipients.length > 0) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast('Email copied to clipboard');
    } catch {
      toast('Could not copy', 'error');
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      setError('Add at least one recipient.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipients, subject: subject.trim(), body }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        throw new Error(msg || `Failed (${res.status})`);
      }
      toast(`Email sent to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`);
      onClose();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'Failed to send email'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Draft follow-up email" size="lg" closeOnBackdrop={!sending}>
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            To
          </label>
          <div className="flex flex-wrap gap-1.5 px-2 py-1.5 bg-white/5 border border-gray-800 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500/50 transition">
            {recipients.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-xs text-emerald-200"
              >
                {r}
                <button
                  type="button"
                  onClick={() => removeRecipient(r)}
                  className="text-emerald-300 hover:text-white"
                  aria-label={`Remove ${r}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleRecipientKey}
              onBlur={() => {
                if (recipientInput.trim()) {
                  addRecipient(recipientInput);
                  setRecipientInput('');
                }
              }}
              placeholder={recipients.length ? '' : 'name@example.com, …'}
              className="flex-1 min-w-[140px] bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none px-1 py-0.5"
            />
          </div>
          <p className="text-[11px] text-gray-600 mt-1">Press Enter, comma or space to add.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-2">
            Message
            {streaming && (
              <span className="inline-flex items-center gap-1 text-emerald-400 normal-case tracking-normal">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Drafting…
              </span>
            )}
          </label>
          {loading ? (
            <div className="space-y-2 px-3 py-3 bg-white/5 border border-gray-800 rounded-lg">
              <div className="skeleton-shimmer h-3 w-3/4 rounded" />
              <div className="skeleton-shimmer h-3 w-full rounded" />
              <div className="skeleton-shimmer h-3 w-5/6 rounded" />
              <div className="skeleton-shimmer h-3 w-2/3 rounded" />
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="w-full px-3 py-2 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition resize-y leading-relaxed font-mono"
            />
          )}
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center pt-2 border-t border-emerald-900/20">
          <button
            type="button"
            onClick={handleCopy}
            disabled={streaming || !body}
            className="px-3 py-2 text-sm text-gray-300 hover:text-white border border-gray-800 hover:border-emerald-500/40 rounded-lg disabled:opacity-50 transition"
          >
            Copy
          </button>
          <div className="flex gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || streaming || recipients.length === 0 || !body.trim()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              {sending ? 'Sending…' : `Send${recipients.length ? ` (${recipients.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

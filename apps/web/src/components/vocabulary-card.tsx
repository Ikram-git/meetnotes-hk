'use client';

import { useEffect, useState } from 'react';
import { useToast } from './toast';
import { friendlyErrorMessage } from '@/lib/errors';

interface Term {
  id: string;
  term: string;
  created_by: string | null;
  created_at: string;
}

export function VocabularyCard() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/workspace-vocabulary')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setTerms(d.terms ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/workspace-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: value }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        setError(friendlyErrorMessage(msg, 'Could not add the term'));
        return;
      }
      const { term } = await res.json();
      setTerms((prev) => [term, ...prev]);
      setDraft('');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = terms;
    setTerms((t) => t.filter((x) => x.id !== id));
    const res = await fetch(`/api/workspace-vocabulary/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setTerms(prev);
      toast('Failed to remove term', 'error');
    }
  };

  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-emerald-900/20">
        <h2 className="text-sm font-semibold text-white">Custom vocabulary</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Names, jargon, or product terms the transcriber should recognise. Shared across your whole workspace.
        </p>
      </div>
      <div className="p-6 space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Briva, Voyage AI, Toppan Security"
            maxLength={80}
            className="flex-1 px-3 py-2 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition"
          />
          <button
            type="submit"
            disabled={!draft.trim() || adding}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer h-7 rounded-lg" style={{ width: `${50 + i * 15}%` }} />
            ))}
          </div>
        ) : terms.length === 0 ? (
          <p className="text-xs text-gray-600">
            No terms yet. Add proper nouns or jargon you say often — the transcriber will stop mangling them.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {terms.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-emerald-900/30 rounded-lg text-xs text-gray-200 group"
              >
                <span>{t.term}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  className="text-gray-600 hover:text-red-400 transition"
                  aria-label={`Remove ${t.term}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

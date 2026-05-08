'use client';

import { useEffect, useState } from 'react';
import { confirmDialog } from './confirm-dialog';
import { friendlyErrorMessage } from '@/lib/errors';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function MeetingComments({ meetingId }: { meetingId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/meetings/${meetingId}/comments`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setComments(d.comments ?? []);
        setCurrentUserId(d.currentUserId ?? null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft.trim() }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        setError(friendlyErrorMessage(msg, 'Failed to post comment'));
        return;
      }
      // Refetch so we get the new comment with hydrated author
      const r2 = await fetch(`/api/meetings/${meetingId}/comments`);
      const d2 = await r2.json();
      setComments(d2.comments ?? []);
      setDraft('');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const ok = await confirmDialog({
      title: 'Delete comment',
      message: 'This comment will be permanently removed.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    const res = await fetch(`/api/meetings/${meetingId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (res.ok) setComments((c) => c.filter((x) => x.id !== commentId));
  };

  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Comments {comments.length > 0 && <span className="text-sm text-gray-500 font-normal">({comments.length})</span>}
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton-shimmer w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton-shimmer h-3 w-32 rounded" />
                <div className="skeleton-shimmer h-3 rounded" style={{ width: `${70 - i * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500">No comments yet. Start the conversation.</p>
          ) : (
            <ul className="space-y-4 mb-5">
              {comments.map((c) => {
                const initials = (c.author.full_name || c.author.email)[0]?.toUpperCase() ?? '?';
                const isMine = c.user_id === currentUserId;
                return (
                  <li key={c.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-semibold">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">
                          {c.author.full_name || c.author.email}
                          {isMine && <span className="text-gray-500 ml-1.5 font-normal">(you)</span>}
                        </span>
                        <span className="text-[11px] text-gray-600">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {c.content}
                      </div>
                      {isMine && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="mt-1 text-[11px] text-red-400 hover:text-red-300 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handlePost} className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Leave a comment for your team…"
              rows={2}
              maxLength={4000}
              className="w-full px-3 py-2 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition resize-none"
            />
            {error && <div className="text-xs text-red-400">{error}</div>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={posting || !draft.trim()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

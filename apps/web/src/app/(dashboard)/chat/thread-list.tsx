'use client';

import { useState } from 'react';
import { confirmDialog } from '@/components/confirm-dialog';

export interface ThreadSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export function ThreadList({
  threads,
  loading,
  activeThreadId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: {
  threads: ThreadSummary[];
  loading: boolean;
  activeThreadId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const groups = groupByDate(threads);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ok = await confirmDialog({
      title: 'Delete chat',
      message: 'This conversation and all its messages will be permanently removed.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    const res = await fetch(`/api/workspace-chat/threads/${id}`, { method: 'DELETE' });
    if (res.ok) onDelete(id);
  };

  const startRename = (e: React.MouseEvent, t: ThreadSummary) => {
    e.stopPropagation();
    setRenaming(t.id);
    setRenameValue(t.title ?? '');
  };

  const submitRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenaming(null);
      return;
    }
    const res = await fetch(`/api/workspace-chat/threads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    if (res.ok) {
      onRename(id, renameValue.trim());
    }
    setRenaming(null);
  };

  return (
    <aside className="bg-[#111916] border border-emerald-900/30 rounded-2xl flex flex-col overflow-hidden">
      <div className="p-3 border-b border-emerald-900/20">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer h-8 rounded-md" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-500 text-center">
            No saved chats yet. Ask a question to start.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-gray-600 font-semibold">
                {group.label}
              </div>
              {group.threads.map((t) => {
                const isActive = t.id === activeThreadId;
                const isRenaming = renaming === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`group mx-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-2 ${
                      isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {isRenaming ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(t.id);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        onBlur={() => submitRename(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-white/5 border border-emerald-900/30 rounded px-2 py-0.5 text-xs text-white"
                      />
                    ) : (
                      <span className="flex-1 min-w-0 truncate text-xs">
                        {t.title || 'Untitled chat'}
                      </span>
                    )}
                    {!isRenaming && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                        <button
                          onClick={(e) => startRename(e, t)}
                          className="p-1 text-gray-500 hover:text-gray-200"
                          aria-label="Rename"
                          title="Rename"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, t.id)}
                          className="p-1 text-gray-500 hover:text-red-400"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function groupByDate(threads: ThreadSummary[]): Array<{ label: string; threads: ThreadSummary[] }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const buckets: Record<string, ThreadSummary[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    'Last 30 days': [],
    Older: [],
  };

  for (const t of threads) {
    const d = new Date(t.updated_at);
    if (d >= today) buckets.Today.push(t);
    else if (d >= yesterday) buckets.Yesterday.push(t);
    else if (d >= weekAgo) buckets['Last 7 days'].push(t);
    else if (d >= monthAgo) buckets['Last 30 days'].push(t);
    else buckets.Older.push(t);
  }

  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, threads: list }));
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Workspace = {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
};

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(data.workspaces ?? []);
        setActiveId(readCookie('briva_workspace_id') ?? data.workspaces?.[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (id: string) => {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    await fetch(`/api/workspaces/${id}/switch`, { method: 'POST' });
    setActiveId(id);
    setOpen(false);
    router.refresh();
    window.location.reload();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setCreating(false);
    if (!res.ok) return;
    const { workspace } = await res.json();
    await fetch(`/api/workspaces/${workspace.id}/switch`, { method: 'POST' });
    window.location.reload();
  };

  const active = workspaces.find((w) => w.id === activeId);

  if (loading) {
    return <div className="w-32 h-9 rounded-lg bg-white/5 animate-pulse" />;
  }
  if (!active) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition border border-emerald-900/30"
      >
        <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {active.name[0]?.toUpperCase()}
        </div>
        <span className="font-medium flex-1 text-left truncate">{active.name}</span>
        <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-[#111916] rounded-xl shadow-xl border border-emerald-900/30 py-1 z-50">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-gray-600 font-semibold">
            Workspaces
          </div>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSwitch(ws.id)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
            >
              <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {ws.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="truncate">{ws.name}</div>
                <div className="text-[11px] text-gray-600 capitalize">{ws.role}</div>
              </div>
              {ws.id === activeId && (
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}

          <div className="border-t border-emerald-900/20 mt-1 pt-1">
            {showCreate ? (
              <form onSubmit={handleCreate} className="px-3 py-2 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-gray-800 rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="flex-1 bg-emerald-500 text-white py-1.5 rounded-md text-xs font-medium hover:bg-emerald-400 transition disabled:opacity-50"
                  >
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setNewName(''); }}
                    className="px-2.5 text-xs text-gray-500 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition"
              >
                <div className="w-6 h-6 rounded border border-dashed border-gray-700 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Create workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

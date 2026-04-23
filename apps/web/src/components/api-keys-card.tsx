'use client';

import { useEffect, useState } from 'react';
import { useToast } from './toast';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const res = await fetch('/api/api-keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setKeys([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createKey = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create key');
      setJustCreated(data.plaintext);
      setNewName('');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create key', 'error');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this API key? Apps using it will stop working immediately.')) return;
    const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Key revoked.', 'success');
      load();
    } else {
      toast('Failed to revoke key.', 'error');
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard.', 'success');
    } catch {
      toast('Copy failed — select and copy manually.', 'error');
    }
  };

  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-emerald-900/20">
        <h2 className="text-sm font-semibold text-white">API Keys</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Connect Zapier, custom scripts, or other tools to your Briva account.
        </p>
      </div>
      <div className="p-6 space-y-4">
        {justCreated && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-400 mb-1">
              Copy this key now — you won&apos;t be able to see it again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/40 border border-amber-500/20 rounded px-3 py-2 text-xs text-amber-200 font-mono break-all">
                {justCreated}
              </code>
              <button
                onClick={() => copy(justCreated)}
                className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium px-3 py-2 rounded flex-shrink-0"
              >
                Copy
              </button>
              <button
                onClick={() => setJustCreated(null)}
                className="text-xs text-gray-400 hover:text-white flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createKey()}
            placeholder='e.g. "Zapier" or "My CLI script"'
            disabled={creating}
            className="flex-1 px-3 py-2 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
          />
          <button
            onClick={createKey}
            disabled={creating || !newName.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Generate key'}
          </button>
        </div>

        {keys === null ? (
          <p className="text-xs text-gray-500">Loading…</p>
        ) : keys.filter((k) => !k.revoked_at).length === 0 ? (
          <p className="text-xs text-gray-500">No API keys yet.</p>
        ) : (
          <ul className="divide-y divide-emerald-900/20 -mx-6">
            {keys
              .filter((k) => !k.revoked_at)
              .map((k) => (
                <li key={k.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{k.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {k.key_prefix}…{' · '}
                      created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at ? ` · used ${new Date(k.last_used_at).toLocaleDateString()}` : ' · never used'}
                    </p>
                  </div>
                  <button
                    onClick={() => revoke(k.id)}
                    className="text-xs text-red-400 hover:text-red-300 flex-shrink-0"
                  >
                    Revoke
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

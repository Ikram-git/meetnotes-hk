'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = {
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
};

type Invite = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  expires_at: string;
  created_at: string;
};

export function TeamSettingsClient({
  workspace,
  members: initialMembers,
  invites: initialInvites,
  currentUserId,
  currentUserRole,
}: {
  workspace: { id: string; name: string } | null;
  members: Member[];
  invites: Invite[];
  currentUserId: string;
  currentUserRole: 'owner' | 'admin' | 'member' | null;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [name, setName] = useState(workspace?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  if (!workspace) {
    return <p className="text-sm text-gray-500">Workspace not found.</p>;
  }

  const handleRename = async () => {
    if (!name.trim() || name.trim() === workspace.name) return;
    setSavingName(true);
    setError(null);
    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSavingName(false);
    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? 'Failed to rename');
      return;
    }
    setSuccess('Workspace renamed');
    router.refresh();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInviting(true);
    const res = await fetch(`/api/workspaces/${workspace.id}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? 'Failed to send invite');
      return;
    }
    const { invite } = await res.json();
    setInvites([
      { id: invite.id, email: invite.email, role: invite.role, expires_at: invite.expires_at, created_at: new Date().toISOString() },
      ...invites,
    ]);
    setInviteEmail('');
    setSuccess(`Invite sent to ${invite.email}`);
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Revoke this invite?')) return;
    const res = await fetch(`/api/workspaces/${workspace.id}/invites/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) setInvites(invites.filter((i) => i.id !== id));
  };

  const handleChangeRole = async (userId: string, role: 'admin' | 'member') => {
    const res = await fetch(`/api/workspaces/${workspace.id}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setMembers(members.map((m) => (m.user.id === userId ? { ...m, role } : m)));
    } else {
      const { error: msg } = await res.json();
      setError(msg ?? 'Failed to change role');
    }
  };

  const handleRemoveMember = async (userId: string, isSelf: boolean) => {
    const msg = isSelf
      ? 'Leave this workspace? You will lose access to all its meetings.'
      : 'Remove this member from the workspace?';
    if (!confirm(msg)) return;
    const res = await fetch(`/api/workspaces/${workspace.id}/members/${userId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      if (isSelf) {
        window.location.href = '/meetings';
      } else {
        setMembers(members.filter((m) => m.user.id !== userId));
      }
    } else {
      const { error } = await res.json();
      setError(error ?? 'Failed to remove');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-xl text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          {success}
        </div>
      )}

      {/* Workspace name */}
      <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-900/20">
          <h2 className="text-sm font-semibold text-white">Workspace</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin}
                className="flex-1 px-3.5 py-2.5 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition disabled:opacity-50"
              />
              {isAdmin && (
                <button
                  onClick={handleRename}
                  disabled={savingName || !name.trim() || name.trim() === workspace.name}
                  className="px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-50"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite member */}
      {isAdmin && (
        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-900/20">
            <h2 className="text-sm font-semibold text-white">Invite member</h2>
          </div>
          <form onSubmit={handleInvite} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Role</label>
              <div className="flex gap-2">
                {(['member', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInviteRole(r)}
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${
                      inviteRole === r
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                        : 'bg-white/5 border-emerald-900/30 text-gray-400 hover:text-white'
                    }`}
                  >
                    {r === 'member' ? 'Member' : 'Admin'}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="w-full bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {inviting ? 'Sending invite…' : 'Send invite'}
            </button>
          </form>
        </div>
      )}

      {/* Members */}
      <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-900/20 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Members ({members.length})</h2>
        </div>
        <div className="divide-y divide-emerald-900/20">
          {members.map((m) => {
            const isSelf = m.user.id === currentUserId;
            const initials = (m.user.full_name || m.user.email)[0]?.toUpperCase() ?? '?';
            return (
              <div key={m.user.id} className="px-6 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {m.user.full_name || m.user.email}
                    {isSelf && <span className="text-gray-500 ml-1.5">(you)</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{m.user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && !isSelf && m.role !== 'owner' ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.user.id, e.target.value as 'admin' | 'member')}
                      className="bg-white/5 border border-gray-800 rounded-md px-2 py-1 text-xs text-gray-300"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-xs text-gray-500 capitalize px-2">{m.role}</span>
                  )}
                  {(isAdmin && !isSelf && m.role !== 'owner') || (isSelf && m.role !== 'owner') ? (
                    <button
                      onClick={() => handleRemoveMember(m.user.id, isSelf)}
                      className="text-xs text-red-400 hover:text-red-300 px-2"
                    >
                      {isSelf ? 'Leave' : 'Remove'}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {isAdmin && invites.length > 0 && (
        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-900/20">
            <h2 className="text-sm font-semibold text-white">Pending invites ({invites.length})</h2>
          </div>
          <div className="divide-y divide-emerald-900/20">
            {invites.map((inv) => (
              <div key={inv.id} className="px-6 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{inv.email}</div>
                  <div className="text-xs text-gray-500">
                    {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeInvite(inv.id)}
                  className="text-xs text-red-400 hover:text-red-300 px-2"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

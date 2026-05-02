'use client';

import { useState } from 'react';
import Link from 'next/link';

export function InviteAcceptClient({
  token,
  inviteEmail,
  loggedInEmail,
}: {
  token: string;
  inviteEmail: string;
  loggedInEmail: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches =
    loggedInEmail && loggedInEmail.toLowerCase() === inviteEmail.toLowerCase();

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/invites/${token}/accept`, { method: 'POST' });
    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? 'Failed to accept invite');
      setLoading(false);
      return;
    }
    window.location.href = '/meetings';
  };

  if (!loggedInEmail) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400">
          Sign in or create an account using <span className="text-white font-medium">{inviteEmail}</span> to accept.
        </p>
        <Link
          href={`/signup?invite=${token}&email=${encodeURIComponent(inviteEmail)}`}
          className="block w-full bg-emerald-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-emerald-400 transition text-center"
        >
          Sign up
        </Link>
        <Link
          href={`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`}
          className="block w-full bg-white/5 border border-emerald-900/30 text-gray-300 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-white/10 transition text-center"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!emailMatches) {
    return (
      <div className="space-y-3">
        <div className="px-4 py-3 rounded-xl text-sm bg-amber-500/10 border border-amber-500/20 text-amber-300">
          You're signed in as <span className="font-medium">{loggedInEmail}</span>, but this invite was sent to{' '}
          <span className="font-medium">{inviteEmail}</span>.
        </div>
        <Link
          href={`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`}
          className="block w-full bg-emerald-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-emerald-400 transition text-center"
        >
          Switch account
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full bg-emerald-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-50"
      >
        {loading ? 'Joining…' : 'Accept invitation'}
      </button>
    </div>
  );
}

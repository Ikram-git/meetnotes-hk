'use client';

import { useEffect, useState } from 'react';
import { Modal } from './modal';
import { useToast } from './toast';
import { confirmDialog } from './confirm-dialog';

export function ShareDialog({
  open,
  onClose,
  meetingId,
}: {
  open: boolean;
  onClose: () => void;
  meetingId: string;
}) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setCreating(true);
      try {
        const res = await fetch(`/api/meetings/${meetingId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: null }),
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setShareUrl(data.shareUrl);
          setHasPassword(!!data.hasPassword);
        }
      } finally {
        if (!cancelled) setCreating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, meetingId]);

  useEffect(() => {
    if (!open) {
      setShareUrl(null);
      setPassword('');
      setShowPassword(false);
      setHasPassword(false);
    }
  }, [open]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast('Link copied to clipboard');
  };

  const handleSetPassword = async () => {
    if (!password.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      if (res.ok) {
        setHasPassword(true);
        setShowPassword(false);
        setPassword('');
        toast('Password set');
      } else {
        toast('Failed to set password', 'error');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleRemovePassword = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: null }),
      });
      if (res.ok) {
        setHasPassword(false);
        toast('Password removed');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleRevoke = async () => {
    const ok = await confirmDialog({
      title: 'Revoke share link',
      message: 'Anyone using this link will lose access. You can create a new link later, but it will be a different URL.',
      confirmLabel: 'Revoke',
      variant: 'destructive',
    });
    if (!ok) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share`, { method: 'DELETE' });
      if (res.ok) {
        toast('Share link revoked');
        onClose();
      } else {
        toast('Failed to revoke link', 'error');
      }
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share meeting" size="md">
      <div className="p-5 space-y-4">
        {creating ? (
          <div className="py-8 text-center text-sm text-gray-500">Creating share link…</div>
        ) : shareUrl ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Public link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-3 py-2 bg-white/5 border border-gray-800 rounded-lg text-sm text-gray-300 font-mono"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition"
                >
                  Copy
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-600">
                Anyone with this link can view the meeting summary and transcript.
              </p>
            </div>

            <div className="border-t border-emerald-900/20 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Password protection</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {hasPassword
                      ? 'A password is required to view this link.'
                      : 'No password — anyone with the link gets access.'}
                  </p>
                </div>
                {hasPassword ? (
                  <button
                    onClick={handleRemovePassword}
                    disabled={updating}
                    className="text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : (
                  !showPassword && (
                    <button
                      onClick={() => setShowPassword(true)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Add password
                    </button>
                  )
                )}
              </div>

              {showPassword && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSetPassword();
                  }}
                  className="mt-3 flex gap-2"
                >
                  <input
                    autoFocus
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    className="flex-1 px-3 py-2 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={updating || !password.trim()}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {updating ? 'Saving…' : 'Set'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword(false);
                      setPassword('');
                    }}
                    className="px-2 text-xs text-gray-500 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            <div className="border-t border-emerald-900/20 pt-4 flex items-center justify-between">
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
              >
                Revoke share link
              </button>
              <button
                onClick={onClose}
                className="text-xs text-gray-500 hover:text-gray-300 transition"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-sm text-red-400">
            Failed to create share link.
          </div>
        )}
      </div>
    </Modal>
  );
}

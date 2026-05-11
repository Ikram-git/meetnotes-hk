'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from './toast';
import { confirmDialog } from './confirm-dialog';

interface Status {
  connected: boolean;
  email?: string;
}

export function OutlookIntegrationCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const o = searchParams.get('outlook');
    if (o === 'connected') toast('Outlook Calendar connected.', 'success');
    else if (o === 'denied') toast('You declined Outlook Calendar access.', 'error');
    else if (o === 'no_refresh_token') toast('Outlook didn’t return a refresh token — try reconnecting.', 'error');
    else if (o === 'state_mismatch') toast('OAuth state mismatch — please retry.', 'error');
    else if (o === 'missing_service_key') toast('Server missing SUPABASE_SERVICE_ROLE_KEY.', 'error');
    else if (o === 'db_error') toast('Failed to save integration. Check Supabase.', 'error');
    else if (o === 'error') {
      const m = searchParams.get('outlook_error');
      toast(`Outlook error: ${m || 'unknown'}`, 'error');
    }
    if (o) {
      const url = new URL(window.location.href);
      url.searchParams.delete('outlook');
      url.searchParams.delete('outlook_error');
      router.replace(url.pathname + (url.search ? url.search : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/outlook/calendar/events');
      const data = await res.json();
      setStatus({ connected: !!data.connected, email: data.email });
    } catch {
      setStatus({ connected: false });
    }
  };

  const connect = () => {
    setBusy(true);
    window.location.href = '/api/outlook/auth/start';
  };

  const disconnect = async () => {
    const ok = await confirmDialog({
      title: 'Disconnect Outlook Calendar',
      message: 'Briva will stop seeing your upcoming Outlook meetings until you reconnect.',
      confirmLabel: 'Disconnect',
      variant: 'destructive',
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch('/api/outlook/disconnect', { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      setStatus({ connected: false });
      toast('Outlook Calendar disconnected.', 'success');
    } else {
      toast('Failed to disconnect.', 'error');
    }
  };

  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-emerald-900/20">
        <h2 className="text-sm font-semibold text-white">Outlook Calendar</h2>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              {/* Outlook-style square icon */}
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2" fill="#0078D4" />
                <path d="M3 7l9 6 9-6" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Microsoft 365 / Outlook</h3>
              {status === null ? (
                <p className="text-xs text-gray-500 mt-0.5">Checking status…</p>
              ) : status.connected ? (
                <>
                  <p className="text-xs text-emerald-400 mt-0.5">Connected{status.email ? ` — ${status.email}` : ''}</p>
                  <p className="text-xs text-gray-500 mt-1">Briva can see your upcoming Outlook meetings and auto-link recordings to events.</p>
                </>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">Auto-link recordings to your Outlook meetings. Read-only access.</p>
              )}
            </div>
          </div>
          {status === null ? null : status.connected ? (
            <button
              onClick={disconnect}
              disabled={busy}
              className="bg-white/5 hover:bg-white/10 text-gray-300 text-sm px-4 py-2 rounded-lg disabled:opacity-50 flex-shrink-0"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={busy}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex-shrink-0"
            >
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

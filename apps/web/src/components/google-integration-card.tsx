'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from './toast';
import { confirmDialog } from './confirm-dialog';

interface Status {
  connected: boolean;
  email?: string;
}

export function GoogleIntegrationCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const g = searchParams.get('google');
    if (g === 'connected') toast('Google Calendar connected.', 'success');
    else if (g === 'denied') toast('You declined Google Calendar access.', 'error');
    else if (g === 'no_refresh_token') toast('Google didn\u2019t return a refresh token \u2014 try removing the app from your Google account and reconnecting.', 'error');
    else if (g === 'state_mismatch') toast('OAuth state mismatch \u2014 please retry.', 'error');
    else if (g === 'missing_service_key') toast('Server missing SUPABASE_SERVICE_ROLE_KEY.', 'error');
    else if (g === 'db_error') toast('Failed to save integration. Check Supabase.', 'error');
    else if (g === 'error') {
      const m = searchParams.get('google_error');
      toast(`Google error: ${m || 'unknown'}`, 'error');
    }
    if (g) {
      const url = new URL(window.location.href);
      url.searchParams.delete('google');
      url.searchParams.delete('google_error');
      router.replace(url.pathname + (url.search ? url.search : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/google/calendar/events');
      const data = await res.json();
      setStatus({ connected: !!data.connected, email: data.email });
    } catch {
      setStatus({ connected: false });
    }
  };

  const connect = () => {
    setBusy(true);
    window.location.href = '/api/google/auth/start';
  };

  const disconnect = async () => {
    const ok = await confirmDialog({
      title: 'Disconnect Google Calendar',
      message: 'Briva will stop seeing your upcoming meetings until you reconnect.',
      confirmLabel: 'Disconnect',
      variant: 'destructive',
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch('/api/google/disconnect', { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      setStatus({ connected: false });
      toast('Google Calendar disconnected.', 'success');
    } else {
      toast('Failed to disconnect.', 'error');
    }
  };

  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-emerald-900/20">
        <h2 className="text-sm font-semibold text-white">Integrations</h2>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" fill="#4285F4"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Google Calendar</h3>
              {status === null ? (
                <p className="text-xs text-gray-500 mt-0.5">Checking status…</p>
              ) : status.connected ? (
                <>
                  <p className="text-xs text-emerald-400 mt-0.5">Connected{status.email ? ` — ${status.email}` : ''}</p>
                  <p className="text-xs text-gray-500 mt-1">Briva can see your upcoming meetings and auto-link recordings to calendar events.</p>
                </>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">Auto-link recordings to your meetings. Read-only access.</p>
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

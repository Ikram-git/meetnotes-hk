'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './toast';

/**
 * Per-user toggle that lives on the Team page because it controls how
 * THIS user's meetings auto-fan-out to teammates. Each member opts in
 * independently — turning it on means: "when I upload a meeting, send
 * the recap to my workspace teammates and any calendar attendees."
 */
export function WorkspaceAutomationCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [tier, setTier] = useState<'free' | 'pro' | 'team' | 'enterprise'>('free');
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('auto_email_recap, subscription_tier')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setEnabled(!!data.auto_email_recap);
        setTier((data.subscription_tier || 'free') as typeof tier);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isFree = tier === 'free';

  const handleToggle = async (next: boolean) => {
    if (isFree) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ auto_email_recap: next })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast('Could not save preference', 'error');
      return;
    }
    setEnabled(next);
    toast(next ? 'Auto-recap on' : 'Auto-recap off');
  };

  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-emerald-900/20">
        <h2 className="text-sm font-semibold text-white">My recap notifications</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Per-user — controls what happens when you upload a meeting in this workspace.
        </p>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="skeleton-shimmer h-12 rounded-lg" />
        ) : (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              disabled={isFree || saving}
              onChange={(e) => handleToggle(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-700 bg-white/5 text-emerald-500 focus:ring-emerald-500/30 disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-white">Auto-email recap to teammates &amp; attendees</span>
                {isFree && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                    PRO+
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                When a meeting you upload finishes summarising, Briva emails the recap to
                every other workspace member and (if linked) every Google Calendar attendee.
                Skips meetings under 2 minutes and sends only once per meeting.
              </p>
              {isFree && (
                <p className="text-xs text-amber-400/80 mt-1.5">
                  Upgrade to Pro to enable auto-recap.
                </p>
              )}
            </div>
          </label>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useToast } from './toast';

type Policy = 'keep' | 'delete_after_processing' | 'delete_after_7_days' | 'delete_after_30_days';

const OPTIONS: Array<{ value: Policy; title: string; desc: string }> = [
  {
    value: 'keep',
    title: 'Keep forever',
    desc: 'Audio stays available for re-summarising or re-listening. Transcripts and summaries are always kept regardless.',
  },
  {
    value: 'delete_after_processing',
    title: 'Delete after processing',
    desc: 'Audio is deleted as soon as transcription and summary finish. Maximum privacy for sensitive meetings.',
  },
  {
    value: 'delete_after_7_days',
    title: 'Delete after 7 days',
    desc: 'Audio kept for a week, then removed automatically by a scheduled job.',
  },
  {
    value: 'delete_after_30_days',
    title: 'Delete after 30 days',
    desc: 'Audio kept for a month, then removed automatically.',
  },
];

export function AudioRetentionCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<Policy>('keep');
  const [canEdit, setCanEdit] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/workspace-audio-retention')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.policy) setPolicy(d.policy as Policy);
        setCanEdit(!!d.canEdit);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = async (next: Policy) => {
    if (next === policy || saving) return;
    setSaving(true);
    const previous = policy;
    setPolicy(next); // optimistic
    const res = await fetch('/api/workspace-audio-retention', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setPolicy(previous);
      const { error } = await res.json().catch(() => ({}));
      toast(error || 'Could not save retention policy', 'error');
      return;
    }
    toast('Audio retention updated');
  };

  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-emerald-900/20">
        <h2 className="text-sm font-semibold text-white">Audio retention</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Workspace-wide rule for what happens to raw audio after transcription. Transcripts and
          summaries are always kept until you delete the meeting.{' '}
          <a href="/security" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">
            Read our security commitments →
          </a>
        </p>
      </div>
      <div className="p-6 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          OPTIONS.map((opt) => {
            const active = policy === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={!canEdit || saving}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-500/40'
                    : 'bg-white/[0.03] border-emerald-900/30 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                      active ? 'border-emerald-400 bg-emerald-500' : 'border-gray-600'
                    }`}
                  >
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-200'}`}>
                      {opt.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.desc}</div>
                  </div>
                </div>
              </button>
            );
          })
        )}
        {!loading && !canEdit && (
          <p className="text-xs text-gray-600 italic mt-2">
            Only workspace owners and admins can change this setting.
          </p>
        )}
      </div>
    </div>
  );
}

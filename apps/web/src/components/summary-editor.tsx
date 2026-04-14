'use client';

import { useState } from 'react';

interface SummaryEditorProps {
  meetingId: string;
  summary: {
    id: string;
    overview?: string | null;
    overview_zh?: string | null;
    summary_text: string;
    summary_text_zh?: string;
    key_points?: Array<{ text: string; text_zh?: string }>;
    action_items?: Array<{ text: string; text_zh?: string; assignee?: string; due_date?: string; status: string }>;
  };
  onSave: (updated: any) => void;
  onCancel: () => void;
}

export function SummaryEditor({ meetingId, summary, onSave, onCancel }: SummaryEditorProps) {
  const [overview, setOverview] = useState(summary.overview || '');
  const [overviewZh, setOverviewZh] = useState(summary.overview_zh || '');
  const [summaryText, setSummaryText] = useState(summary.summary_text);
  const [summaryZh, setSummaryZh] = useState(summary.summary_text_zh || '');
  const [keyPoints, setKeyPoints] = useState(summary.key_points || []);
  const [actions, setActions] = useState(summary.action_items || []);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/summary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overview: overview || null,
          overview_zh: overviewZh || null,
          summary_text: summaryText,
          summary_text_zh: summaryZh || null,
          key_points: keyPoints,
          action_items: actions,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      onSave(data);
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateKeyPoint = (i: number, field: 'text' | 'text_zh', value: string) => {
    setKeyPoints((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  };
  const removeKeyPoint = (i: number) => setKeyPoints((prev) => prev.filter((_, idx) => idx !== i));
  const addKeyPoint = () => setKeyPoints((prev) => [...prev, { text: '' }]);

  const updateAction = (i: number, field: string, value: string) => {
    setActions((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  };
  const removeAction = (i: number) => setActions((prev) => prev.filter((_, idx) => idx !== i));
  const addAction = () => setActions((prev) => [...prev, { text: '', assignee: '', status: 'pending' }]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Edit Notes</h2>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Overview / TL;DR */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">TL;DR (1-2 sentences)</label>
        <textarea value={overview} onChange={(e) => setOverview(e.target.value)} rows={2}
          placeholder="The one-sentence version…"
          className="w-full bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50 resize-y" />
      </div>

      {/* Summary Text */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Summary</label>
        <textarea value={summaryText} onChange={(e) => setSummaryText(e.target.value)} rows={5}
          className="w-full bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50 resize-y" />
      </div>

      {/* Chinese Summary (only for existing bilingual rows) */}
      {(summaryZh || summary.summary_text_zh) && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Summary (繁體中文)</label>
          <textarea value={summaryZh} onChange={(e) => setSummaryZh(e.target.value)} rows={4}
            className="w-full bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50 resize-y"
            placeholder="Traditional Chinese summary…" />
        </div>
      )}

      {/* Key Points */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-400">Key Points</label>
          <button onClick={addKeyPoint} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
        </div>
        <div className="space-y-2">
          {keyPoints.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p.text} onChange={(e) => updateKeyPoint(i, 'text', e.target.value)}
                placeholder="Key point…"
                className="flex-1 bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50" />
              <button onClick={() => removeKeyPoint(i)} className="text-red-400 hover:text-red-300 px-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-400">Action Items</label>
          <button onClick={addAction} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
        </div>
        <div className="space-y-2">
          {actions.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input value={a.text} onChange={(e) => updateAction(i, 'text', e.target.value)}
                placeholder="Action item…"
                className="flex-1 bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50" />
              <input value={a.assignee || ''} onChange={(e) => updateAction(i, 'assignee', e.target.value)}
                placeholder="Assignee"
                className="w-28 bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50" />
              <input value={a.due_date || ''} onChange={(e) => updateAction(i, 'due_date', e.target.value)}
                placeholder="Due date"
                className="w-28 bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50" />
              <button onClick={() => removeAction(i)} className="text-red-400 hover:text-red-300 px-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

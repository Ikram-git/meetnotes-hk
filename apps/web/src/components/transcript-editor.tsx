'use client';

import { useState } from 'react';
import { formatTime } from '@/lib/utils';

interface Segment {
  id: string;
  segment_index: number;
  speaker_label: string | null;
  start_time_ms: number;
  end_time_ms: number;
  text: string;
  language: string | null;
  confidence: number | null;
}

interface TranscriptEditorProps {
  meetingId: string;
  segments: Segment[];
  speakerMap: Record<string, string>;
  onSave: (updatedSegments: Segment[]) => void;
  onCancel: () => void;
}

export function TranscriptEditor({ meetingId, segments, speakerMap, onSave, onCancel }: TranscriptEditorProps) {
  const [editedSegments, setEditedSegments] = useState<Segment[]>(() =>
    segments.map(s => ({ ...s }))
  );
  const [saving, setSaving] = useState(false);

  const getSpeakerColor = (label: string | null) => {
    if (!label) return 'text-gray-500';
    const colors = ['text-emerald-400', 'text-cyan-400', 'text-purple-400', 'text-amber-400', 'text-pink-400'];
    const match = label.match(/\d+/);
    const index = match ? parseInt(match[0]) : 0;
    return colors[index % colors.length];
  };

  const handleTextChange = (index: number, newText: string) => {
    setEditedSegments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: newText };
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes = editedSegments
        .filter((seg, i) => seg.text !== segments[i].text)
        .map(seg => ({ id: seg.id, text: seg.text }));

      if (changes.length > 0) {
        const res = await fetch(`/api/meetings/${meetingId}/transcript`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: changes }),
        });
        if (!res.ok) throw new Error('Failed to save');
      }
      onSave(editedSegments);
    } catch {
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = editedSegments.some((seg, i) => seg.text !== segments[i].text);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Edit Transcript</h2>
        <div className="flex items-center gap-2">
          <button onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!hasChanges || saving}
            className="px-4 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {editedSegments.map((segment, i) => (
          <div key={segment.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-transparent hover:border-emerald-900/20">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${getSpeakerColor(segment.speaker_label)}`}>
                {segment.speaker_label ? (speakerMap[segment.speaker_label] || segment.speaker_label) : 'Unknown'}
              </span>
              <span className="text-xs text-gray-600">{formatTime(segment.start_time_ms)}</span>
            </div>
            <textarea
              value={segment.text}
              onChange={(e) => handleTextChange(i, e.target.value)}
              rows={Math.max(1, Math.ceil(segment.text.length / 80))}
              className="w-full bg-transparent text-sm text-gray-300 leading-relaxed resize-none focus:outline-none focus:bg-white/[0.03] rounded p-1 -m-1 border border-transparent focus:border-emerald-900/30"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

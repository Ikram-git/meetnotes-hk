'use client';

import { useState } from 'react';

interface ActionItem {
  text: string;
  text_zh?: string;
  assignee: string;
  due_date?: string;
  status: string;
}

interface ActionItemsListProps {
  items: ActionItem[];
  speakerMap?: Record<string, string>;
  onStatusChange?: (index: number, status: string) => void;
  showChinese?: boolean;
}

const SPEAKER_COLORS = [
  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
];

function getSpeakerStyle(label: string | null) {
  if (!label) return SPEAKER_COLORS[0];
  const match = label.match(/\d+/);
  const index = match ? parseInt(match[0]) : 0;
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

export function ActionItemsList({
  items,
  speakerMap = {},
  onStatusChange,
  showChinese = false,
}: ActionItemsListProps) {
  const [localItems, setLocalItems] = useState(items);

  const toggleStatus = (index: number) => {
    const newStatus =
      localItems[index].status === 'completed' ? 'pending' : 'completed';
    const updated = [...localItems];
    updated[index] = { ...updated[index], status: newStatus };
    setLocalItems(updated);
    onStatusChange?.(index, newStatus);
  };

  if (localItems.length === 0) {
    return (
      <p className="text-sm text-gray-500">No action items identified.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {localItems.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <button
            onClick={() => toggleStatus(i)}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              item.status === 'completed'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-gray-700 hover:border-emerald-500'
            }`}
          >
            {item.status === 'completed' && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm ${
                item.status === 'completed'
                  ? 'text-gray-600 line-through'
                  : 'text-gray-300'
              }`}
            >
              {item.text}
            </p>
            {showChinese && item.text_zh && (
              <p className="text-xs text-gray-500 mt-0.5">{item.text_zh}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              {item.assignee && (() => {
                const style = getSpeakerStyle(item.assignee);
                return (
                  <span className={`text-xs ${style.text} ${style.bg} px-2 py-0.5 rounded-full border ${style.border}`}>
                    {speakerMap[item.assignee] || item.assignee}
                  </span>
                );
              })()}
              {item.due_date && (
                <span className="text-xs text-gray-500">
                  Due: {item.due_date}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

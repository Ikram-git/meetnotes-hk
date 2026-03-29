'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { SearchBar } from './search-bar';
import { formatDate, formatDuration } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  uploaded: 'bg-gray-800 text-gray-400',
  transcribing: 'bg-amber-500/15 text-amber-400',
  transcribed: 'bg-emerald-500/15 text-emerald-400',
  summarising: 'bg-purple-500/15 text-purple-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  error: 'bg-red-500/15 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Uploaded',
  transcribing: 'Transcribing...',
  transcribed: 'Transcribed',
  summarising: 'Summarising...',
  completed: 'Completed',
  error: 'Error',
};

interface Meeting {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  audio_duration_seconds: number | null;
}

interface MeetingsListClientProps {
  meetings: Meeting[];
}

export function MeetingsListClient({ meetings }: MeetingsListClientProps) {
  const [filtered, setFiltered] = useState(meetings);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFiltered(meetings);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(meetings.filter(m =>
      (m.title || 'Untitled Meeting').toLowerCase().includes(q) ||
      m.status.toLowerCase().includes(q) ||
      formatDate(m.created_at).toLowerCase().includes(q)
    ));
  }, [meetings]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <SearchBar onSearch={handleSearch} />
        </div>
        <Link href="/upload" className="flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-400 transition text-sm font-medium whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Upload Audio
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#111916] rounded-xl border border-emerald-900/30">
          <p className="text-sm text-gray-500">No meetings found.</p>
        </div>
      ) : (
        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
          <div className="divide-y divide-emerald-900/20">
            {filtered.map((meeting) => (
              <Link key={meeting.id} href={`/meetings/${meeting.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition group">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-200 truncate group-hover:text-emerald-400 transition">
                    {meeting.title || 'Untitled Meeting'}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-600">{formatDate(meeting.created_at)}</span>
                    {meeting.audio_duration_seconds && (
                      <span className="text-xs text-gray-600">{formatDuration(meeting.audio_duration_seconds)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_STYLES[meeting.status] || STATUS_STYLES.uploaded}`}>
                    {STATUS_LABELS[meeting.status] || meeting.status}
                  </span>
                  <svg className="w-4 h-4 text-gray-700 group-hover:text-emerald-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate, formatDuration, formatTime } from '@/lib/utils';
import { SummaryBullets } from '@/components/summary-bullets';

const SPEAKER_COLORS = ['text-emerald-400', 'text-cyan-400', 'text-purple-400', 'text-amber-400', 'text-pink-400'];

function getSpeakerColor(label: string | null) {
  if (!label) return 'text-gray-500';
  const match = label.match(/\d+/);
  const index = match ? parseInt(match[0]) : 0;
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

interface SharedContentProps {
  token: string;
  requiresPassword: boolean;
  meetingTitle?: string;
  meeting?: any;
  segments?: any[];
  summary?: any;
  speakerMap?: Record<string, string>;
}

export function SharedContent({ token, requiresPassword, meetingTitle, meeting: initialMeeting, segments: initialSegments, summary: initialSummary, speakerMap: initialSpeakerMap }: SharedContentProps) {
  const [unlocked, setUnlocked] = useState(!requiresPassword);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [meeting, setMeeting] = useState(initialMeeting);
  const [segments, setSegments] = useState(initialSegments || []);
  const [summary, setSummary] = useState(initialSummary);
  const [speakerMap, setSpeakerMap] = useState(initialSpeakerMap || {});
  const [activeTab, setActiveTab] = useState<'notes' | 'transcript'>('notes');

  const handleUnlock = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/shared/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError('Incorrect password');
        setLoading(false);
        return;
      }
      // Fetch the meeting data now
      const dataRes = await fetch(`/api/shared/${token}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (dataRes.ok) {
        const data = await dataRes.json();
        setMeeting(data.meeting);
        setSegments(data.segments || []);
        setSummary(data.summary);
        setSpeakerMap(data.speakerMap || {});
      }
      setUnlocked(true);
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  };

  // Password gate
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#080c0a] flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" /><rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" /><rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" /><rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">Briva</span>
            </Link>
            <h1 className="text-lg font-semibold text-white">Protected Meeting Notes</h1>
            {meetingTitle && <p className="text-sm text-gray-500 mt-1">{meetingTitle}</p>}
            <p className="text-sm text-gray-500 mt-3">Enter the password to view these meeting notes.</p>
          </div>

          <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6">
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder="Enter password..."
                autoFocus
                className="flex-1 bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button onClick={handleUnlock} disabled={loading || !password}
              className="w-full mt-4 bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-50">
              {loading ? 'Verifying...' : 'View Notes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Meeting content
  if (!meeting) return null;

  return (
    <div className="min-h-screen bg-[#080c0a]">
      <header className="border-b border-emerald-900/30 bg-[#0a0f0d]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" /><rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" /><rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" /><rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold text-white">Briva</div>
              <div className="text-[9px] font-medium italic text-emerald-400/90 tracking-wide hidden sm:block">
                Hear Beyond Words.
              </div>
            </div>
          </Link>
          <Link href="/signup" className="text-xs sm:text-sm font-medium bg-emerald-500 text-white px-3 sm:px-4 py-1.5 rounded-lg hover:bg-emerald-400 transition">
            Try Briva Free
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{meeting.title || 'Untitled Meeting'}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
            <span>{formatDate(meeting.created_at)}</span>
            {meeting.audio_duration_seconds && <span>{formatDuration(meeting.audio_duration_seconds)}</span>}
          </div>
        </div>

        {/* Tabs — match the authenticated meeting detail layout. AI Chat
            and Comments tabs are auth-gated, so they're omitted here. */}
        <div className="flex gap-1 mb-4 border-b border-emerald-900/20">
          {[
            { key: 'notes', label: 'Notes' },
            { key: 'transcript', label: `Transcript${segments.length > 0 ? ` · ${segments.length}` : ''}` },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as 'notes' | 'transcript')}
                className={`px-4 py-2 -mb-px text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'text-emerald-400 border-emerald-400'
                    : 'text-gray-500 border-transparent hover:text-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'notes' && (
          <div className="space-y-6 stagger-children">
            {summary ? (
              <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-5">
                  <span className="text-xl leading-none">📓</span>
                  Notes
                </h2>
                <div className="space-y-6">
                  {/* TL;DR */}
                  {(summary.overview || summary.summary_text) && (
                    <section>
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        TL;DR
                      </h3>
                      {summary.overview ? (
                        <>
                          <p className="text-gray-200 text-sm leading-relaxed">{summary.overview}</p>
                          {summary.overview_zh && <p className="text-gray-500 text-sm leading-relaxed mt-1.5">{summary.overview_zh}</p>}
                        </>
                      ) : (
                        <>
                          <SummaryBullets text={summary.summary_text} />
                          {summary.summary_text_zh && (
                            <div className="mt-2">
                              <SummaryBullets text={summary.summary_text_zh} muted />
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  )}

                  {/* Key Points */}
                  {Array.isArray(summary.key_points) && summary.key_points.length > 0 && (
                    <section className="pt-5 border-t border-emerald-900/20">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Key Points
                      </h3>
                      <ul className="space-y-2.5">
                        {(summary.key_points as Array<{ text: string; text_zh?: string }>).map((point, i) => (
                          <li key={i} className="flex gap-2.5 text-sm">
                            <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-300 leading-relaxed">{point.text}</p>
                              {point.text_zh && <p className="text-gray-500 leading-relaxed mt-0.5">{point.text_zh}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Topics */}
                  {Array.isArray(summary.topics) && summary.topics.length > 0 && (
                    <section className="pt-5 border-t border-emerald-900/20">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Topics
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(summary.topics as Array<{ name: string }>).map((t, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">{t.name}</span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6 text-sm text-gray-500">
                No summary available for this meeting yet.
              </div>
            )}

            {summary && Array.isArray(summary.action_items) && summary.action_items.length > 0 && (
              <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Action Items</h2>
                <ul className="space-y-3">
                  {(summary.action_items as Array<{ text: string; assignee?: string; due_date?: string }>).map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-gray-700" />
                      <div>
                        <p className="text-sm text-gray-300">{item.text}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {item.assignee && (
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              {speakerMap[item.assignee] || item.assignee}
                            </span>
                          )}
                          {item.due_date && <span className="text-xs text-gray-500">Due: {item.due_date}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          segments.length > 0 ? (
            <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Transcript</h2>
                <span className="text-xs text-gray-600">{segments.length} segments</span>
              </div>
              <div className="space-y-3">
                {segments.map((seg: any) => (
                  <div key={seg.id} className="text-sm p-2.5 rounded-lg">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-medium ${getSpeakerColor(seg.speaker_label)}`}>
                        {seg.speaker_label ? (speakerMap[seg.speaker_label] || seg.speaker_label) : 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-600">{formatTime(seg.start_time_ms)}</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{seg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6 text-sm text-gray-500">
              No transcript available.
            </div>
          )
        )}

        <div className="mt-12 text-center animate-fade-in">
          <p className="text-sm text-gray-500 mb-4">Want AI meeting notes for your meetings?</p>
          <Link href="/signup" className="inline-block bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-400 transition">
            Try Briva Free
          </Link>
        </div>
      </main>
    </div>
  );
}

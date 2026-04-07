import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatDuration, formatTime } from '@/lib/utils';

export default async function SharedMeetingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Find meeting by share token (no auth required)
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('share_token', token)
    .single();

  if (!meeting) notFound();

  // Get segments and summary
  const [segmentsResult, summaryResult, mappingsResult] = await Promise.all([
    supabase.from('transcript_segments').select('*').eq('meeting_id', meeting.id).order('segment_index', { ascending: true }),
    supabase.from('summaries').select('*').eq('meeting_id', meeting.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('speaker_mappings').select('speaker_label, speaker_name').eq('meeting_id', meeting.id),
  ]);

  const segments = segmentsResult.data || [];
  const summary = summaryResult.data;
  const speakerMap: Record<string, string> = {};
  for (const m of (mappingsResult.data || [])) speakerMap[m.speaker_label] = m.speaker_name;

  const getSpeakerColor = (label: string | null) => {
    if (!label) return 'text-gray-500';
    const colors = ['text-emerald-400', 'text-cyan-400', 'text-purple-400', 'text-amber-400', 'text-pink-400'];
    const match = label.match(/\d+/);
    const index = match ? parseInt(match[0]) : 0;
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-[#080c0a]">
      <header className="border-b border-emerald-900/30 bg-[#0a0f0d]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-base font-bold text-white">MeetNotes</span>
          </Link>
          <span className="text-xs text-gray-600">Shared meeting notes</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{meeting.title || 'Untitled Meeting'}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
            <span>{formatDate(meeting.created_at)}</span>
            {meeting.audio_duration_seconds && <span>{formatDuration(meeting.audio_duration_seconds)}</span>}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Summary */}
          <div className="space-y-6">
            {summary && (
              <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{summary.summary_text}</p>
                {summary.summary_text_zh && (
                  <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap mt-3 pt-3 border-t border-emerald-900/20">{summary.summary_text_zh}</p>
                )}
                {Array.isArray(summary.topics) && summary.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {(summary.topics as Array<{ name: string }>).map((t, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Items */}
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

            {/* Key Decisions */}
            {summary && Array.isArray(summary.key_decisions) && summary.key_decisions.length > 0 && (
              <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Key Decisions</h2>
                <ul className="space-y-3">
                  {(summary.key_decisions as Array<{ text: string; speaker?: string }>).map((d, i) => (
                    <li key={i} className="text-sm text-gray-300 pl-4" style={{ borderLeftWidth: '3px', borderLeftColor: '#10b981' }}>
                      <p>{d.text}</p>
                      {d.speaker && <span className="text-xs text-gray-600 mt-1 block">{speakerMap[d.speaker] || d.speaker}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Transcript */}
          {segments.length > 0 && (
            <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Transcript</h2>
                <span className="text-xs text-gray-600">{segments.length} segments</span>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
          )}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">Want AI meeting notes for your meetings?</p>
          <Link href="/signup" className="inline-block bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-400 transition">
            Try MeetNotes Free
          </Link>
        </div>
      </main>
    </div>
  );
}

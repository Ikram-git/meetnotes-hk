'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AudioPlayer } from './audio-player';
import { TranscriptViewer } from './transcript-viewer';
import { TranscriptEditor } from './transcript-editor';
import { SummaryEditor } from './summary-editor';
import { ActionItemsList } from './action-items-list';
import { ExportDropdown } from './export-dropdown';
import { SpeakerNamingModal } from './speaker-naming-modal';
import { ProcessingBanner } from './processing-banner';
import { SkeletonTranscript } from './skeleton-transcript';
import { SkeletonSummary, SkeletonActionItems } from './skeleton-summary';
import { useToast } from './toast';
import { formatDate, formatDuration } from '@/lib/utils';
import { isValidLanguageCode, getLanguageByCode } from '@/lib/i18n/languages';
import { LanguageSelector } from './language-selector';

const PROCESSING_STATUSES = ['uploaded', 'transcribing', 'transcribed', 'summarising'] as const;
type ProcessingStatus = typeof PROCESSING_STATUSES[number];

const STATUS_STYLES: Record<string, string> = {
  uploaded: 'bg-gray-800 text-gray-400',
  transcribing: 'bg-amber-500/15 text-amber-400',
  transcribed: 'bg-emerald-500/15 text-emerald-400',
  summarising: 'bg-purple-500/15 text-purple-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  error: 'bg-red-500/15 text-red-400',
};

// Any supported language code from SUPPORTED_LANGUAGES or 'both' for bilingual EN+繁中.
type Language = string;

interface MeetingDetailClientProps {
  meeting: any;
  segments: any[];
  summary: any | null;
  speakerMappings: Array<{ speaker_label: string; speaker_name: string }>;
  audioUrl: string | null;
}

export function MeetingDetailClient({ meeting: initialMeeting, segments: initialSegments, summary: initialSummary, speakerMappings, audioUrl }: MeetingDetailClientProps) {
  const { toast } = useToast();
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [seekTimeMs, setSeekTimeMs] = useState<number | undefined>(undefined);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of speakerMappings) map[m.speaker_label] = m.speaker_name;
    return map;
  });
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [segments, setSegments] = useState(initialSegments);
  const [meeting, setMeeting] = useState(initialMeeting);
  const [isProcessing, setIsProcessing] = useState(false);
  /** The language we're currently regenerating the summary into, or null if idle. */
  const [regeneratingTo, setRegeneratingTo] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialMeeting.title || '');

  // Edit modes
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);

  // Speaker naming modal
  const [speakerModal, setSpeakerModal] = useState<{ open: boolean; label: string; name: string }>({
    open: false, label: '', name: '',
  });

  const isProcessingStatus = (PROCESSING_STATUSES as readonly string[]).includes(meeting.status);

  // Auto-trigger summarisation once transcription completes — this replaces
  // the old fire-and-forget server→server fetch from /api/transcribe, which
  // was unreliable on Vercel (container kill + function timeout).
  const autoSummaryTriggered = useRef(false);
  useEffect(() => {
    if (autoSummaryTriggered.current) return;
    if (meeting.status !== 'transcribed') return;
    if (initialSummary) return; // Already has a summary from a previous run
    if (initialSegments.length === 0) return; // Wait for segments to load
    autoSummaryTriggered.current = true;

    // Read the persisted language preference synchronously from localStorage
    // so we don't race with the language-loading effect.
    let language: Language = 'en';
    try {
      const saved = localStorage.getItem(`meetnotes-lang-${initialMeeting.id}`) as Language | null;
      if (saved && ['en', 'zh-Hant', 'both'].includes(saved)) language = saved;
    } catch {}

    fetch(`/api/meetings/${initialMeeting.id}/summarise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    }).catch(() => {
      // Non-fatal — the polling loop will eventually surface any status
      // change, and the user can still click Regenerate manually.
    });
  }, [meeting.status, initialSummary, initialSegments.length, initialMeeting.id]);

  // Auto-poll when meeting is still processing
  useEffect(() => {
    if (!isProcessingStatus) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/meetings/${meeting.id}`);
        if (!res.ok) return;
        const updated = await res.json();

        setMeeting(updated);

        // If status changed to completed or error, fetch full data
        if (updated.status === 'completed' || updated.status === 'error') {
          // Fetch segments + summary
          const [segRes, sumRes] = await Promise.all([
            fetch(`/api/meetings/${meeting.id}/transcript`).catch(() => null),
            fetch(`/api/meetings/${meeting.id}/summarise`).catch(() => null),
          ]);

          // Use the server page reload to get fresh data cleanly
          window.location.reload();
          return;
        }

        // If transcribed but no segments yet, also reload
        if (updated.status === 'transcribed' && segments.length === 0) {
          window.location.reload();
          return;
        }
      } catch {}
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isProcessingStatus, meeting.id, segments.length]);

  // Persist language selection per meeting in localStorage
  const storageKey = `meetnotes-lang-${initialMeeting.id}`;
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && isValidLanguageCode(saved)) {
      setLangState(saved);
    }
  }, [storageKey]);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem(storageKey, l);
  };

  const handleTimeUpdate = useCallback((timeMs: number) => setCurrentTimeMs(timeMs), []);
  const handleSegmentClick = useCallback((timeMs: number) => setSeekTimeMs(timeMs), []);

  const handleSpeakerRename = useCallback(async (label: string, newName: string) => {
    // Get the current display name before updating the map
    const oldName = speakerMap[label] || label; // e.g. "John" if already renamed, or "Speaker 0"
    setSpeakerMap((prev) => ({ ...prev, [label]: newName }));
    setSpeakerModal({ open: false, label: '', name: '' });

    // Replace old display name in summary text, action items, and key decisions
    const replaceInText = (text: string) => text.replace(new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newName);

    setSummary((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        summary_text: prev.summary_text ? replaceInText(prev.summary_text) : prev.summary_text,
        summary_text_zh: prev.summary_text_zh ? replaceInText(prev.summary_text_zh) : prev.summary_text_zh,
        action_items: prev.action_items?.map((a: any) => ({
          ...a,
          text: a.text ? replaceInText(a.text) : a.text,
          text_zh: a.text_zh ? replaceInText(a.text_zh) : a.text_zh,
        })),
        key_decisions: prev.key_decisions?.map((d: any) => ({
          ...d,
          text: d.text ? replaceInText(d.text) : d.text,
          text_zh: d.text_zh ? replaceInText(d.text_zh) : d.text_zh,
        })),
        key_quotes: prev.key_quotes?.map((q: any) => ({
          ...q,
          text: q.text ? replaceInText(q.text) : q.text,
        })),
      };
    });

    try {
      await fetch(`/api/meetings/${meeting.id}/speakers`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerLabel: label, speakerName: newName }),
      });
    } catch {
      setSpeakerMap((prev) => { const next = { ...prev }; delete next[label]; return next; });
    }
  }, [meeting.id]);

  const openSpeakerModal = useCallback((label: string) => {
    setSpeakerModal({ open: true, label, name: speakerMap[label] || label });
  }, [speakerMap]);

  const handleTitleSave = async () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== meeting.title) {
      setMeeting((m: any) => ({ ...m, title: trimmed }));
      await fetch(`/api/meetings/${meeting.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
    }
    setEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this meeting? This will remove the audio, transcript, and summary permanently.')) return;
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, { method: 'DELETE' });
      if (res.ok) router.push('/meetings');
      else toast('Failed to delete meeting', 'error');
    } catch { toast('Failed to delete meeting', 'error'); }
  };

  const handleRetryTranscription = useCallback(async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(`Transcription failed: ${data.error || 'Unknown error'}`, 'error');
      } else {
        window.location.reload();
      }
    } catch { toast('Failed to start transcription', 'error'); }
    finally { setIsProcessing(false); }
  }, [meeting.id]);

  const runSummary = async (language: Language) => {
    localStorage.setItem(storageKey, language);
    setIsProcessing(true);
    setRegeneratingTo(language);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/summarise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(`Summary failed: ${data.error || 'Unknown error'}`, 'error');
        setIsProcessing(false);
        setRegeneratingTo(null);
        return;
      }
      window.location.reload();
    } catch {
      toast('Failed to generate summary', 'error');
      setIsProcessing(false);
      setRegeneratingTo(null);
    }
  };

  const handleActionStatusChange = useCallback(async (_index: number, _status: string) => {}, []);

  // When the user picks a new language from the top selector, immediately
  // regenerate the summary + action items + decisions + topics in that
  // language. We don't regenerate the transcript — it stays in the original
  // audio language. Only runs if a summary already exists and we have
  // segments to work from.
  const handleLanguageChange = useCallback((newLang: string) => {
    if (newLang === lang) return;
    setLang(newLang);
    // Only auto-regenerate if there's already a summary to translate.
    // The prominent banner at the top of the page replaces the toast
    // we used to show here.
    if (summary && segments.length > 0 && !isProcessing) {
      runSummary(newLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, summary, segments.length, isProcessing]);

  const canGenerate = segments.length > 0;
  const primarySummary = summary?.summary_text || '';
  const chineseSummary = summary?.summary_text_zh || '';

  return (
    <div>
      {/* Speaker naming modal */}
      <SpeakerNamingModal
        open={speakerModal.open}
        speakerLabel={speakerModal.label}
        currentName={speakerModal.name}
        onSave={handleSpeakerRename}
        onClose={() => setSpeakerModal({ open: false, label: '', name: '' })}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                  className="text-xl sm:text-2xl font-bold text-white bg-transparent border-b-2 border-emerald-500 outline-none py-0.5 px-1 -ml-1 w-full"
                />
                <button onClick={handleTitleSave} className="text-emerald-400 hover:text-emerald-300 text-sm">Save</button>
                <button onClick={() => setEditingTitle(false)} className="text-gray-500 hover:text-gray-300 text-sm">Cancel</button>
              </div>
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold text-white group cursor-pointer truncate" onClick={() => { setTitleDraft(meeting.title || ''); setEditingTitle(true); }}>
                {meeting.title || 'Untitled Meeting'}
                <svg className="w-4 h-4 inline-block ml-2 text-gray-700 group-hover:text-emerald-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </h1>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
              <span>{formatDate(meeting.created_at)}</span>
              {meeting.audio_duration_seconds && <span>{formatDuration(meeting.audio_duration_seconds)}</span>}
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[meeting.status] || ''}`}>{meeting.status}</span>
            </div>
            {meeting.error_message && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">{meeting.error_message}</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {/* Global language selector — changing this re-translates the
                summary, action items, decisions, and topics into the chosen
                language. The transcript stays in the original audio language. */}
            {segments.length > 0 && (
              <LanguageSelector
                value={lang}
                onChange={handleLanguageChange}
                label="Language:"
                disabled={isProcessing}
              />
            )}
            {(meeting.status === 'uploaded' || (meeting.status === 'error' && segments.length === 0)) && (
              <button onClick={handleRetryTranscription} disabled={isProcessing}
                className="px-3 py-2 bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessing ? 'Processing...' : meeting.status === 'error' ? 'Retry' : 'Transcribe'}
              </button>
            )}
            {summary && <ExportDropdown meetingId={meeting.id} />}
            <button onClick={handleDelete} title="Delete meeting"
              className="p-2 text-gray-600 hover:text-red-400 transition rounded-lg hover:bg-red-500/10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Processing banner — shown only while the meeting is still being processed */}
      {isProcessingStatus && meeting.status !== 'error' && (
        <ProcessingBanner
          status={meeting.status as ProcessingStatus}
          audioDurationSeconds={meeting.audio_duration_seconds}
          startedAt={meeting.updated_at || meeting.created_at}
        />
      )}

      {/* Regenerating banner — shown while the summary is being re-translated
          to a new language (or regenerated manually). Prominent, page-wide. */}
      {regeneratingTo && !isProcessingStatus && (
        <div className="mb-6 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <span className="absolute inset-0 rounded-xl animate-ping bg-emerald-500/20" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                  Translating your meeting notes…
                </h3>
                {(() => {
                  const target = getLanguageByCode(regeneratingTo);
                  return target ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                      <span className="text-sm leading-none">{target.flag}</span>
                      {target.nativeName}
                    </span>
                  ) : null;
                })()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Claude is rewriting the summary, action items, key decisions, and topics. The transcript stays in the original audio language. This takes about 15–25 seconds.
              </p>
              {/* Indeterminate shimmer bar */}
              <div className="mt-3 h-1 bg-emerald-900/30 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full animate-progress-sweep" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Player */}
      <div className="mb-6">
        <AudioPlayer audioUrl={audioUrl} currentTimeMs={seekTimeMs} onTimeUpdate={handleTimeUpdate} />
      </div>

      {/* Content grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6">
            {editingSummary && summary ? (
              <SummaryEditor
                meetingId={meeting.id}
                summary={summary}
                onSave={(updated) => { setSummary(updated); setEditingSummary(false); }}
                onCancel={() => setEditingSummary(false)}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-white">Summary</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {segments.length > 0 && (
                      <>
                        {/* Generate / Regenerate button (language is picked
                            from the selector in the page header) */}
                        {canGenerate && (
                          <button onClick={() => runSummary(lang)} disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? (
                              <>
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Generating...
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {summary ? 'Regenerate' : 'Generate'}
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}

                    {/* Edit button */}
                    {summary && (
                      <button onClick={() => setEditingSummary(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-emerald-400 transition">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {isProcessingStatus && !summary ? (
                  <SkeletonSummary />
                ) : isProcessing && meeting.status === 'summarising' ? (
                  <SkeletonSummary />
                ) : summary ? (
                  <div className="space-y-4">
                    {primarySummary && <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{primarySummary}</p>}
                    {chineseSummary && (
                      <p className={`whitespace-pre-wrap text-sm leading-relaxed ${primarySummary ? 'text-gray-500 border-t border-emerald-900/20 pt-3' : 'text-gray-300'}`}>
                        {chineseSummary}
                      </p>
                    )}
                    {summary.sentiment && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Tone:</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          summary.sentiment === 'positive' ? 'bg-emerald-500/15 text-emerald-400'
                            : summary.sentiment === 'tense' ? 'bg-red-500/15 text-red-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}>{summary.sentiment}</span>
                      </div>
                    )}
                    {Array.isArray(summary.topics) && summary.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(summary.topics as Array<{ name: string }>).map((topic, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">{topic.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    {segments.length > 0 ? 'Select a language above and click Generate.' : 'Your summary will appear here once transcription completes.'}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Action Items */}
          {summary && Array.isArray(summary.action_items) && summary.action_items.length > 0 ? (
            <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Action Items</h2>
              <ActionItemsList items={summary.action_items as any[]} speakerMap={speakerMap} onStatusChange={handleActionStatusChange} />
            </div>
          ) : isProcessingStatus && !summary ? (
            <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Action Items</h2>
              <SkeletonActionItems />
            </div>
          ) : null}

          {/* Key Decisions */}
          {summary && Array.isArray(summary.key_decisions) && summary.key_decisions.length > 0 && (
            <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Key Decisions</h2>
              <ul className="space-y-3">
                {(summary.key_decisions as Array<{ text: string; text_zh?: string; speaker?: string }>).map((decision, i) => (
                  <li key={i} className="text-sm text-gray-300 pl-4" style={{ borderLeftWidth: '3px', borderLeftColor: '#10b981' }}>
                    <p>{decision.text}</p>
                    {decision.text_zh && <p className="text-gray-500 mt-0.5">{decision.text_zh}</p>}
                    {decision.speaker && <span className="text-xs text-gray-600 mt-1 block">{speakerMap[decision.speaker] || decision.speaker}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4 sm:p-6">
          {editingTranscript ? (
            <TranscriptEditor
              meetingId={meeting.id}
              segments={segments}
              speakerMap={speakerMap}
              onSave={(updated) => { setSegments(updated); setEditingTranscript(false); }}
              onCancel={() => setEditingTranscript(false)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Transcript</h2>
                <div className="flex items-center gap-2">
                  {segments.length > 0 && (
                    <>
                      <span className="text-xs text-gray-600">{segments.length} segments</span>
                      <button onClick={() => setEditingTranscript(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-emerald-400 transition">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
              {segments.length > 0 ? (
                <TranscriptViewer
                  segments={segments}
                  speakerMap={speakerMap}
                  currentTimeMs={currentTimeMs}
                  onSegmentClick={handleSegmentClick}
                  onSpeakerRename={(label) => openSpeakerModal(label)}
                />
              ) : isProcessingStatus ? (
                <SkeletonTranscript />
              ) : (
                <p className="text-gray-500 text-sm">No transcript available yet.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

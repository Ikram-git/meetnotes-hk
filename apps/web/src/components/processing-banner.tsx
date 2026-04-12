'use client';

import { useEffect, useState } from 'react';

type ProcessingStatus = 'uploaded' | 'transcribing' | 'transcribed' | 'summarising';

interface ProcessingBannerProps {
  status: ProcessingStatus;
  audioDurationSeconds?: number | null;
  startedAt?: string | null;
}

const STAGES = [
  { id: 'upload', label: 'Upload', description: 'Audio received' },
  { id: 'transcribe', label: 'Transcribe', description: 'Deepgram is listening for speakers and auto-detecting the language…' },
  { id: 'summarise', label: 'Summarise', description: 'Claude is extracting action items, key decisions, and topics…' },
  { id: 'ready', label: 'Ready', description: 'Your meeting notes are ready to review.' },
] as const;

const TIPS = [
  '💡 Tip: MeetNotes auto-detects 30+ languages — including code-switched HK-style meetings.',
  '💡 Tip: Click any speaker name on the transcript to rename them — it sticks.',
  '💡 Tip: You can regenerate the summary in English, 繁中, or both at any time.',
  '💡 Tip: Action items can be checked off from the meeting detail page.',
  '💡 Tip: Share any meeting with a password-protected link from the Share menu.',
];

function statusToStageIndex(status: ProcessingStatus): number {
  switch (status) {
    case 'uploaded': return 1; // transcribe is active
    case 'transcribing': return 1;
    case 'transcribed': return 2; // summarise is active
    case 'summarising': return 2;
    default: return 0;
  }
}

// Rough ETA: Deepgram ~30x real-time, Claude summary ~10s
function estimateSecondsRemaining(
  status: ProcessingStatus,
  audioDurationSeconds: number | null | undefined,
  elapsedMs: number,
): number | null {
  if (!audioDurationSeconds) return null;
  const transcribeSecs = Math.max(8, Math.round(audioDurationSeconds / 30));
  const summariseSecs = 12;
  const totalSecs = transcribeSecs + summariseSecs;
  const elapsedSecs = Math.floor(elapsedMs / 1000);

  if (status === 'uploaded' || status === 'transcribing') {
    return Math.max(5, totalSecs - elapsedSecs);
  }
  if (status === 'transcribed' || status === 'summarising') {
    return Math.max(5, summariseSecs - Math.floor(elapsedMs / 1000));
  }
  return null;
}

function formatSeconds(secs: number): string {
  if (secs < 60) return `~${secs} sec`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `~${m} min` : `~${m}m ${s}s`;
}

export function ProcessingBanner({ status, audioDurationSeconds, startedAt }: ProcessingBannerProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Tick every second for ETA
  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 1000);
    setElapsedMs(Date.now() - start);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  // Rotate tips every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeIndex = statusToStageIndex(status);
  const etaSecs = estimateSecondsRemaining(status, audioDurationSeconds, elapsedMs);
  const activeStage = STAGES[activeIndex];

  return (
    <div className="mb-6 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/25 rounded-2xl p-5 sm:p-6 animate-glow-pulse">
      {/* Stepper */}
      <div className="flex items-center justify-between gap-2 mb-5">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeIndex;
          const isActive = idx === activeIndex;
          return (
            <div key={stage.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300'
                      : 'bg-white/5 border border-emerald-900/30 text-gray-600'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-4 h-4 animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <>
                      <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
                      <span className="relative w-2 h-2 rounded-full bg-emerald-300" />
                    </>
                  ) : (
                    <span className="text-xs font-semibold">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-medium ${
                    isActive ? 'text-emerald-300' : isDone ? 'text-emerald-400' : 'text-gray-600'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div className="flex-1 h-px mx-2 sm:mx-3 mt-[-18px] bg-gradient-to-r from-emerald-500/40 via-emerald-900/30 to-emerald-900/20 relative overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-700 ${
                      isDone ? 'w-full' : isActive ? 'w-1/2' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current status row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-end gap-[3px] h-4 text-emerald-400 flex-shrink-0" aria-hidden>
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {activeStage.label === 'Transcribe' && 'Transcribing your meeting…'}
              {activeStage.label === 'Summarise' && 'Summarising with Claude…'}
              {activeStage.label === 'Upload' && 'Preparing audio…'}
              {activeStage.label === 'Ready' && 'Almost done…'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{activeStage.description}</p>
          </div>
        </div>
        {etaSecs !== null && (
          <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 self-start sm:self-auto flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{formatSeconds(etaSecs)} remaining</span>
          </div>
        )}
      </div>

      {/* Rotating tip */}
      <div className="mt-4 pt-4 border-t border-emerald-900/20">
        <p key={tipIndex} className="text-xs text-gray-500 animate-fade-in">
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}

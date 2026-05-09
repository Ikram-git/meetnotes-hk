'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Auto-playing marketing reel that cycles through five scenes
 * showcasing the platform: live recording, AI summary, asking BRIVA
 * a question, team comments / tasks, and the CTA.
 *
 * The whole thing runs on a single timeline driven by `tick` (advances
 * every ~80ms while playing). Each scene reads tick offsets into
 * derived booleans so animations never get out of sync. Loops
 * automatically until the tab is hidden or the user pauses.
 */

type SceneId = 'capture' | 'summary' | 'ask' | 'team' | 'share' | 'cta';

interface Scene {
  id: SceneId;
  durationMs: number;
}

const SCENES: Scene[] = [
  { id: 'capture', durationMs: 6000 },
  { id: 'summary', durationMs: 5000 },
  { id: 'ask',     durationMs: 6500 },
  { id: 'team',    durationMs: 5000 },
  { id: 'share',   durationMs: 4500 },
  { id: 'cta',     durationMs: 3500 },
];

const TOTAL_MS = SCENES.reduce((s, x) => s + x.durationMs, 0);
const TICK_MS = 80;

const TRANSCRIPT = [
  { speaker: 'Sarah', color: 'emerald', text: 'Mobile support is the #1 priority for Q3.', delay: 400 },
  { speaker: 'James', color: 'cyan',    text: 'I can ship the new export templates by end of month.', delay: 1700 },
  { speaker: 'Lisa',  color: 'purple',  text: 'Mobile prototype ready next Friday — I\'ll loop in design.', delay: 3200 },
];

const ACTION_ITEMS = [
  { text: 'Deliver mobile responsive prototype', who: 'Lisa',  due: 'Next Fri',  color: 'purple' },
  { text: 'Ship updated PDF + email exports',    who: 'James', due: 'End of mo.', color: 'cyan' },
  { text: 'Lock Q3 roadmap with leadership',     who: 'Sarah', due: 'This week', color: 'emerald' },
];

const QUESTION = 'What did Lisa commit to?';
const ANSWER =
  'Lisa is delivering the mobile responsive prototype by next Friday and looping the design team in. She also flagged React Native for phase two.';

const COMMENTS = [
  { name: 'James',  initial: 'J', text: 'Sharing PDF mockups Wed — cc design.', delay: 600 },
  { name: 'Lisa',   initial: 'L', text: 'On it — RN ticket created in Linear.', delay: 1900 },
];

export function DemoReel({ compact = false }: { compact?: boolean }) {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pause when the tab isn't visible to avoid wasted re-renders.
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setTick((t) => (t + TICK_MS) % TOTAL_MS);
    }, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  // Resolve which scene we're in + how far into it.
  const { sceneIndex, sceneOffset } = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < SCENES.length; i++) {
      const next = acc + SCENES[i].durationMs;
      if (tick < next) return { sceneIndex: i, sceneOffset: tick - acc };
      acc = next;
    }
    return { sceneIndex: SCENES.length - 1, sceneOffset: 0 };
  }, [tick]);

  const scene = SCENES[sceneIndex].id;
  const restart = () => setTick(0);

  return (
    <div className={`demo-reel-frame relative w-full ${compact ? 'max-w-3xl' : 'max-w-5xl'} mx-auto`}>
      {/* App-frame chrome wrapper */}
      <div className="relative rounded-2xl border border-emerald-900/30 bg-[#0a0f0d] shadow-2xl overflow-hidden">
        {/* Top bar — neutral, no platform-specific traffic-light dots */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-emerald-900/30 bg-[#080c0a]/60">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
                <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-white tracking-wide">Briva</span>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-emerald-900/30 text-[10px] text-gray-400 font-mono">
            meetings · Q3 Product Roadmap
          </span>
          <div className="ml-auto">
            <SceneTimeline current={sceneIndex} />
          </div>
        </div>

        {/* Scene viewport — fixed aspect for stable embedding */}
        <div className={`relative ${compact ? 'h-[440px]' : 'h-[540px] md:h-[580px]'} bg-[#080c0a] overflow-hidden`}>
          {/* Brand glow backdrop */}
          <div className="absolute inset-0 pointer-events-none opacity-60">
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-500/12 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/06 rounded-full blur-3xl" />
          </div>

          <div className="relative h-full">
            {scene === 'capture' && <SceneCapture offset={sceneOffset} />}
            {scene === 'summary' && <SceneSummary offset={sceneOffset} />}
            {scene === 'ask'     && <SceneAsk offset={sceneOffset} />}
            {scene === 'team'    && <SceneTeam offset={sceneOffset} />}
            {scene === 'share'   && <SceneShare offset={sceneOffset} />}
            {scene === 'cta'     && <SceneCta />}
          </div>
        </div>

        {/* Bottom caption — narrates what the user is seeing */}
        <div className="px-5 py-3 border-t border-emerald-900/30 bg-[#080c0a]/60 flex items-center justify-between">
          <div className="text-sm text-gray-300 font-medium">
            {sceneCaption(scene)}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => setPaused((p) => !p)}
              className="px-2 py-1 rounded hover:bg-white/5 transition"
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? '▶' : '❚❚'}
            </button>
            <button
              onClick={restart}
              className="px-2 py-1 rounded hover:bg-white/5 transition"
              aria-label="Restart"
            >
              ↻
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function sceneCaption(s: SceneId): string {
  switch (s) {
    case 'capture': return 'Live capture — speakers, 30+ languages, and timestamps detected automatically.';
    case 'summary': return 'AI summary with structured action items, the moment recording stops.';
    case 'ask':     return 'Ask BRIVA AI anything — across every meeting your team has run.';
    case 'team':    return 'Comments, task assignments, and reminders shared with the workspace.';
    case 'share':   return 'PDF, email recap, and secure share links — exported in one click.';
    case 'cta':     return 'Briva — every meeting, every action, captured.';
  }
}

function SceneTimeline({ current }: { current: number }) {
  return (
    <div className="hidden sm:flex items-center gap-1">
      {SCENES.map((_, i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all ${
            i === current
              ? 'w-6 bg-emerald-400'
              : i < current
                ? 'w-3 bg-emerald-700'
                : 'w-3 bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Scene 1 — Live capture                                     */
/* ────────────────────────────────────────────────────────── */

function SceneCapture({ offset }: { offset: number }) {
  return (
    <div className="absolute inset-0 p-6 md:p-8 flex flex-col">
      <div className="flex items-center justify-between mb-4 animate-fade-in flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
            <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
          </span>
          <span className="text-sm font-medium text-white">Recording — Q3 Product Roadmap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
            EN
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
            粵語
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
            日本語
          </span>
        </div>
      </div>

      {/* Calendar auto-link toast */}
      <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-emerald-900/30 text-[11px] text-gray-300 animate-fade-in">
        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Auto-linked to <span className="text-white font-medium">Google Calendar event</span> · 3 attendees
      </div>

      {/* Waveform */}
      <div className="flex items-end gap-1 h-12 mb-5 text-emerald-400">
        {Array.from({ length: 56 }).map((_, i) => (
          <span
            key={i}
            className="wave-bar"
            style={{ animationDelay: `${(i * 60) % 800}ms`, height: `${20 + (i * 7) % 28}px` }}
          />
        ))}
      </div>

      {/* Streaming transcript */}
      <div className="flex-1 space-y-3 overflow-hidden">
        {TRANSCRIPT.map((line, i) => {
          const visible = offset > line.delay;
          if (!visible) return null;
          return (
            <div
              key={i}
              className="animate-fade-in-up bg-white/[0.03] border border-emerald-900/30 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-semibold ${
                    line.color === 'emerald' ? 'text-emerald-300' :
                    line.color === 'cyan'    ? 'text-cyan-300' :
                                               'text-purple-300'
                  }`}
                >
                  {line.speaker}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {String(Math.floor((line.delay / 1000) % 60)).padStart(2, '0')}:0{i + 1}
                </span>
              </div>
              <p className="text-sm text-gray-200 leading-snug">{line.text}</p>
            </div>
          );
        })}
        {offset > 4500 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 animate-fade-in pl-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Listening…
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Scene 2 — AI summary                                       */
/* ────────────────────────────────────────────────────────── */

function SceneSummary({ offset }: { offset: number }) {
  return (
    <div className="absolute inset-0 p-6 md:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-2 animate-fade-in">
        <SparkleIcon />
        <span className="text-sm font-medium text-white">Summary generated by Claude</span>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium">
          1m 18s · 3 speakers
        </span>
      </div>

      {/* Overview */}
      {offset > 200 && (
        <div className="bg-white/[0.03] border border-emerald-900/30 rounded-lg p-4 animate-fade-in-up">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-1">Overview</div>
          <p className="text-sm text-gray-200 leading-relaxed">
            Q3 roadmap locked: <strong className="text-white">mobile first</strong>, then export polish,
            then transcription speed. Clear ownership and timelines on each track.
          </p>
        </div>
      )}

      {/* Topics + tone */}
      {offset > 800 && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in-up">
          {['Q3 Roadmap', 'Mobile', 'Exports', 'User Feedback'].map((t) => (
            <span key={t} className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 text-xs rounded-full border border-emerald-500/30">
              {t}
            </span>
          ))}
          <span className="ml-auto px-2.5 py-0.5 bg-emerald-500/15 text-emerald-300 text-xs rounded-full">
            Tone: positive
          </span>
        </div>
      )}

      {/* Action items */}
      {offset > 1400 && (
        <div className="flex-1 bg-white/[0.03] border border-emerald-900/30 rounded-lg p-4 animate-fade-in-up overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquareIcon />
            <span className="text-sm font-semibold text-white">Action items</span>
            <span className="ml-auto text-[10px] text-gray-500">auto-assigned</span>
          </div>
          <ul className="space-y-2.5 stagger-children">
            {ACTION_ITEMS.map((a, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-4 h-4 rounded border-2 border-gray-600" />
                <span className="text-sm text-gray-200 flex-1">{a.text}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    a.color === 'purple'
                      ? 'bg-purple-500/10 text-purple-200 border-purple-500/30'
                      : a.color === 'cyan'
                        ? 'bg-cyan-500/10 text-cyan-200 border-cyan-500/30'
                        : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
                  }`}
                >
                  {a.who}
                </span>
                <span className="text-[11px] text-gray-500 hidden sm:inline">{a.due}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Scene 3 — Ask BRIVA AI                                     */
/* ────────────────────────────────────────────────────────── */

function SceneAsk({ offset }: { offset: number }) {
  // Type the question one character every ~50ms.
  const TYPE_START = 400;
  const TYPE_PER_CHAR = 45;
  const typed = Math.max(0, Math.min(QUESTION.length, Math.floor((offset - TYPE_START) / TYPE_PER_CHAR)));
  const questionText = QUESTION.slice(0, typed);
  const questionDone = typed >= QUESTION.length;

  // Stream the answer 4 chars per tick once the question is sent.
  const STREAM_START = TYPE_START + QUESTION.length * TYPE_PER_CHAR + 600;
  const STREAM_PER_CHAR = 12;
  const streamed = Math.max(0, Math.min(ANSWER.length, Math.floor((offset - STREAM_START) / STREAM_PER_CHAR)));
  const answerText = ANSWER.slice(0, streamed);
  const answerStarted = offset > STREAM_START;

  return (
    <div className="absolute inset-0 p-6 md:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-2 animate-fade-in">
        <SparkleIcon purple />
        <span className="text-sm font-medium text-white">BRIVA AI</span>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-200 text-[11px] font-medium border border-purple-500/30">
          Across all your meetings
        </span>
      </div>

      {/* User question */}
      <div className="self-end max-w-[80%] bg-emerald-500/15 border border-emerald-500/30 rounded-2xl rounded-tr-sm px-4 py-2.5">
        <p className="text-sm text-emerald-50">
          {questionText}
          {!questionDone && <span className="inline-block w-[2px] h-4 bg-emerald-300 align-middle ml-0.5 animate-blink" />}
        </p>
      </div>

      {/* AI answer */}
      {answerStarted && (
        <div className="self-start max-w-[88%] bg-white/[0.04] border border-purple-500/30 rounded-2xl rounded-tl-sm px-4 py-3 animate-fade-in-up">
          <div className="flex items-center gap-1.5 mb-1.5">
            <SparkleIcon purple small />
            <span className="text-[11px] font-bold tracking-wider text-purple-200 uppercase">Answer</span>
          </div>
          <p className="text-sm text-gray-100 leading-relaxed">
            {answerText}
            {streamed < ANSWER.length && (
              <span className="inline-block w-[2px] h-4 bg-purple-200 align-middle ml-0.5 animate-blink" />
            )}
          </p>
          {streamed >= ANSWER.length && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 animate-fade-in">
              <span>Sources:</span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-emerald-900/30">Q3 Roadmap · 0:28</span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-emerald-900/30">Q3 Roadmap · 0:58</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Scene 4 — Team comments + tasks                            */
/* ────────────────────────────────────────────────────────── */

function SceneTeam({ offset }: { offset: number }) {
  const taskDone = offset > 3500;
  return (
    <div className="absolute inset-0 p-6 md:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-2 animate-fade-in">
        <UsersIcon />
        <span className="text-sm font-medium text-white">Briva Team</span>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
          5 members
        </span>
      </div>

      {/* Comments */}
      <div className="space-y-2.5">
        {COMMENTS.map((c, i) => {
          if (offset < c.delay) return null;
          return (
            <div key={i} className="flex items-start gap-3 animate-fade-in-up">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {c.initial}
              </div>
              <div className="flex-1 bg-white/[0.04] border border-emerald-900/30 rounded-lg px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-white">{c.name}</span>
                  <span className="text-[10px] text-gray-500">just now</span>
                </div>
                <p className="text-sm text-gray-200 mt-0.5">{c.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task — checks off near end of scene */}
      {offset > 3000 && (
        <div className="mt-auto bg-white/[0.04] border border-emerald-900/30 rounded-lg px-4 py-3 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <button
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                taskDone
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-gray-600'
              }`}
            >
              {taskDone && (
                <svg className="w-3.5 h-3.5 text-white animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <p className={`text-sm transition ${taskDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                Lisa — mobile prototype handed to design
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-200 border border-purple-500/30">Lisa</span>
                <span className="text-[11px] text-gray-500">Due: Friday</span>
                {taskDone && (
                  <span className="text-[11px] text-emerald-300 ml-auto animate-fade-in">✓ Done — emailed to attendees</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Scene 5 — Share & Export                                   */
/* ────────────────────────────────────────────────────────── */

function SceneShare({ offset }: { offset: number }) {
  return (
    <div className="absolute inset-0 p-6 md:p-8 flex flex-col gap-3">
      <div className="flex items-center gap-2 animate-fade-in">
        <ShareIcon />
        <span className="text-sm font-medium text-white">Export & share</span>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
          One click
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
        {/* PDF */}
        {offset > 200 && (
          <div className="bg-white/[0.04] border border-emerald-900/30 rounded-lg p-3 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-red-300">PDF</span>
              </div>
              <span className="text-xs font-semibold text-white">Branded PDF</span>
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded bg-white/10" />
              <div className="h-1.5 w-4/5 rounded bg-white/10" />
              <div className="h-1.5 w-3/5 rounded bg-white/10" />
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-300">
              <CheckIcon /> Downloaded
            </div>
          </div>
        )}

        {/* Email recap */}
        {offset > 900 && (
          <div className="bg-white/[0.04] border border-emerald-900/30 rounded-lg p-3 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white">Email recap</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">
              <span className="text-white">To:</span> sarah@, james@, lisa@
            </p>
            <p className="text-[11px] text-gray-400 mt-1 truncate">
              Recap: Q3 Product Roadmap
            </p>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-300">
              <CheckIcon /> Sent to 3 attendees
            </div>
          </div>
        )}

        {/* Share link */}
        {offset > 1700 && (
          <div className="bg-white/[0.04] border border-emerald-900/30 rounded-lg p-3 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white">Share link</span>
            </div>
            <div className="text-[10px] font-mono text-purple-200 bg-black/30 rounded px-2 py-1 truncate border border-purple-500/20">
              briva.app/s/q3rd-9k2…
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-300">
              <LockIcon /> Password protected
            </div>
          </div>
        )}
      </div>

      {/* Bottom toast — auto-recap notice */}
      {offset > 2700 && (
        <div className="mt-auto bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-start gap-3 animate-fade-in-up">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Auto-recap delivered</p>
            <p className="text-[11px] text-gray-300 mt-0.5">
              Briva emails the recap to every attendee on the calendar invite — no extra step.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Scene 6 — CTA                                              */
/* ────────────────────────────────────────────────────────── */

function SceneCta() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-scale-in">
        <div className="w-16 h-16 mx-auto bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-glow-pulse mb-5">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
            <rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" />
            <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
            <rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
          </svg>
        </div>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 animate-fade-in-up">
        Every meeting. Every action.
      </h2>
      <p className="text-base md:text-lg text-gray-400 mb-6 animate-fade-in-up">
        Captured, summarised, shared.
      </p>
      <div className="flex items-center gap-3 animate-fade-in-up">
        <a
          href="/signup"
          className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/30"
        >
          Get started — 100 free min/month
        </a>
      </div>
    </div>
  );
}

/* ── Tiny inline icons ───────────────────────────────────── */

function SparkleIcon({ purple, small }: { purple?: boolean; small?: boolean }) {
  const cls = purple ? 'text-purple-300' : 'text-emerald-300';
  const size = small ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <svg className={`${size} ${cls}`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
      <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z" />
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M5 7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m13-9a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2v2H8v-2c0-1.1.9-2 2-2zM5 13h14v8H5z" />
    </svg>
  );
}

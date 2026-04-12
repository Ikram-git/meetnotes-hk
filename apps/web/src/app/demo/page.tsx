'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DEMO_TRANSCRIPT = [
  { speaker: 'Sarah', time: '0:00', text: 'Alright everyone, let\'s get started. The main topic today is the Q3 product roadmap.' },
  { speaker: 'James', time: '0:08', text: 'Sure. I\'ve been looking at the user feedback from last quarter. The top three requests are better exports, mobile support, and faster transcription.' },
  { speaker: 'Sarah', time: '0:18', text: 'Good. Let\'s prioritize. I think mobile support should be our main focus since 40% of our users access from phones.' },
  { speaker: 'Lisa', time: '0:28', text: 'Agreed. I can have the mobile responsive design ready in two weeks. We should also consider a React Native app for phase two.' },
  { speaker: 'James', time: '0:38', text: 'On the export side, I can ship improved PDF and email templates by end of month. The groundwork is already done.' },
  { speaker: 'Sarah', time: '0:48', text: 'Perfect. So the decision is: mobile first, then export polish, then transcription speed improvements. Lisa owns mobile, James owns exports.' },
  { speaker: 'Lisa', time: '0:58', text: 'I\'ll have a prototype ready by next Friday for review.' },
  { speaker: 'James', time: '1:05', text: 'And I\'ll share the new PDF layout with the team next Wednesday.' },
  { speaker: 'Sarah', time: '1:12', text: 'Great. Let\'s reconvene next week. Thanks everyone.' },
];

const DEMO_SUMMARY = {
  text: 'The team discussed the Q3 product roadmap, prioritizing features based on user feedback. Mobile support was identified as the top priority (40% of users on mobile), followed by export polish, and transcription speed improvements. Clear ownership and timelines were established.',
  decisions: [
    { text: 'Mobile support is the #1 priority for Q3', speaker: 'Sarah' },
    { text: 'Roadmap order: mobile → exports → transcription speed', speaker: 'Sarah' },
  ],
  actions: [
    { text: 'Deliver mobile responsive prototype', assignee: 'Lisa', due: 'Next Friday' },
    { text: 'Share new PDF export layout with team', assignee: 'James', due: 'Next Wednesday' },
    { text: 'Ship updated PDF + email exports', assignee: 'James', due: 'End of month' },
  ],
  topics: ['Q3 Roadmap', 'Mobile Support', 'Exports', 'User Feedback'],
  sentiment: 'positive',
};

const SPEAKER_COLORS: Record<string, string> = {
  Sarah: 'text-emerald-400',
  James: 'text-cyan-400',
  Lisa: 'text-purple-400',
};

export default function DemoPage() {
  const [step, setStep] = useState(0); // 0=intro, 1=transcribing, 2=summarising, 3=done
  const [visibleSegments, setVisibleSegments] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const startDemo = () => {
    setStep(1);
    setVisibleSegments(0);
  };

  // Animate transcript appearing
  useEffect(() => {
    if (step !== 1) return;
    if (visibleSegments >= DEMO_TRANSCRIPT.length) {
      setTimeout(() => setStep(2), 800);
      return;
    }
    const timer = setTimeout(() => setVisibleSegments(v => v + 1), 400);
    return () => clearTimeout(timer);
  }, [step, visibleSegments]);

  // Animate summary appearing
  useEffect(() => {
    if (step !== 2) return;
    const t1 = setTimeout(() => setShowSummary(true), 600);
    const t2 = setTimeout(() => setShowDecisions(true), 1200);
    const t3 = setTimeout(() => setShowActions(true), 1800);
    const t4 = setTimeout(() => setStep(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [step]);

  return (
    <div className="min-h-screen bg-[#080c0a]">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#080c0a]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">MeetNotes</span>
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-emerald-500 text-white px-5 py-2 rounded-lg hover:bg-emerald-400 transition">
            Get Started Free
          </Link>
        </div>
      </header>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">See MeetNotes in Action</h1>
            <p className="text-gray-500">Watch how a meeting recording becomes structured notes in seconds</p>
          </div>

          {/* Demo area */}
          {step === 0 ? (
            <div className="text-center py-20 bg-[#111916] rounded-2xl border border-emerald-900/30">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Ready to see the magic?</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">
                We'll simulate a short team meeting and show you exactly how MeetNotes processes it — from raw audio to structured notes.
              </p>
              <button onClick={startDemo}
                className="bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25">
                Start Demo
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left — Transcript */}
              <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Transcript</h2>
                  {step >= 1 && (
                    <span className={`text-xs px-2.5 py-1 rounded-full ${
                      visibleSegments >= DEMO_TRANSCRIPT.length
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {visibleSegments >= DEMO_TRANSCRIPT.length ? 'Complete' : 'Transcribing...'}
                    </span>
                  )}
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {DEMO_TRANSCRIPT.slice(0, visibleSegments).map((seg, i) => (
                    <div key={i} className="text-sm p-2.5 rounded-lg animate-fade-in">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-medium ${SPEAKER_COLORS[seg.speaker]}`}>{seg.speaker}</span>
                        <span className="text-xs text-gray-600">{seg.time}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{seg.text}</p>
                    </div>
                  ))}
                  {step === 1 && visibleSegments < DEMO_TRANSCRIPT.length && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 p-2.5">
                      <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      Listening...
                    </div>
                  )}
                </div>
              </div>

              {/* Right — Summary */}
              <div className="space-y-6">
                <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">AI Summary</h2>
                    {step >= 2 && (
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        step >= 3
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-purple-500/15 text-purple-400'
                      }`}>
                        {step >= 3 ? 'Complete' : 'Generating...'}
                      </span>
                    )}
                  </div>
                  {showSummary ? (
                    <div className="space-y-4 animate-fade-in">
                      <p className="text-gray-300 text-sm leading-relaxed">{DEMO_SUMMARY.text}</p>
                      <div className="flex flex-wrap gap-2">
                        {DEMO_SUMMARY.topics.map((t, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Tone:</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{DEMO_SUMMARY.sentiment}</span>
                      </div>
                    </div>
                  ) : step >= 2 ? (
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      Analyzing transcript...
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Waiting for transcript...</p>
                  )}
                </div>

                {/* Key Decisions */}
                {showDecisions && (
                  <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-white mb-4">Key Decisions</h2>
                    <ul className="space-y-3">
                      {DEMO_SUMMARY.decisions.map((d, i) => (
                        <li key={i} className="text-sm text-gray-300 pl-4" style={{ borderLeftWidth: '3px', borderLeftColor: '#10b981' }}>
                          <p>{d.text}</p>
                          <span className="text-xs text-gray-600 mt-1 block">{d.speaker}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {showActions && (
                  <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-white mb-4">Action Items</h2>
                    <ul className="space-y-3">
                      {DEMO_SUMMARY.actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-gray-700 flex items-center justify-center" />
                          <div>
                            <p className="text-sm text-gray-300">{a.text}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{a.assignee}</span>
                              <span className="text-xs text-gray-500">Due: {a.due}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA after demo */}
          {step === 3 && (
            <div className="text-center mt-12 animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-3">That's MeetNotes.</h2>
              <p className="text-gray-500 mb-8">From recording to structured notes — automatically. Start with 100 free minutes.</p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/signup" className="bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25">
                  Get Started Free
                </Link>
                <button onClick={() => { setStep(0); setVisibleSegments(0); setShowSummary(false); setShowDecisions(false); setShowActions(false); }}
                  className="text-gray-400 px-6 py-3.5 rounded-xl text-base font-medium hover:bg-white/5 transition border border-gray-800">
                  Watch Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

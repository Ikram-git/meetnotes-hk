import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HeroCtas } from '@/components/hero-ctas';
import { DemoReel } from '@/components/demo-reel';
import { ThemeToggle } from '@/components/theme-toggle';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {}

  return (
    <div className="min-h-screen bg-[#080c0a]">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#080c0a]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
                <rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" />
                <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
                <rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Briva</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/demo" className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition px-2 sm:px-4 py-2 hidden sm:block">
              Demo
            </Link>
            <ThemeToggle />
            {isLoggedIn ? (
              <>
                <Link href="/meetings" className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition px-2 sm:px-4 py-2">
                  Dashboard
                </Link>
                <Link href="/upload" className="text-xs sm:text-sm font-medium bg-emerald-500 text-white px-3 sm:px-5 py-2 rounded-lg hover:bg-emerald-400 transition">
                  Upload
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition px-2 sm:px-4 py-2">
                  Log in
                </Link>
                <Link href="/signup" className="text-xs sm:text-sm font-medium bg-emerald-500 text-white px-3 sm:px-5 py-2 rounded-lg hover:bg-emerald-400 transition">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero + demo reel — side-by-side on desktop so the reel is
          above the fold. Stacks on mobile with tighter spacing. */}
      <section className="relative pt-20 sm:pt-24 pb-10 sm:pb-12 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-[minmax(0,1fr),minmax(0,1.15fr)] gap-8 lg:gap-12 items-center">
            {/* Left: copy */}
            <div className="text-center lg:text-left stagger-children">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs sm:text-sm font-medium px-3 py-1 rounded-full mb-5 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                The AI workspace for meetings
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-3">
                Turn meetings into{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  action.
                </span>
              </h1>
              {/* Slogan — small italic, right under the headline */}
              <p className="text-sm sm:text-base font-medium italic text-emerald-400/90 mb-5 tracking-wide">
                Hear Beyond Words.
              </p>
              <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 mb-7 leading-relaxed">
                Capture live, ask BRIVA AI anything across every meeting, and ship the action items — automatically.
              </p>
              <HeroCtas isLoggedIn={isLoggedIn} />
            </div>

            {/* Right: demo reel */}
            <div className="lg:pl-2 animate-fade-in-up">
              <DemoReel compact />
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-emerald-900/20 bg-emerald-950/20 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-gray-500">
          {['100 free minutes/month', '30+ languages, auto-detected', 'Cross-meeting AI search', 'Tasks, comments & shared workspaces'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything between &ldquo;hello&rdquo; and shipped
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Briva captures the call, summarises it, answers questions about it, and pushes the action items to the right people — in one workspace.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {/* Live capture */}
            <div className="bg-gradient-to-br from-purple-950/50 to-purple-950/20 rounded-2xl p-8 border border-purple-800/30 hover-lift">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Live capture, in any language</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Record live with the desktop app or upload any audio. Speakers, timestamps, and 30+ languages — including mid-sentence code-switching — detected automatically.
              </p>
            </div>

            {/* BRIVA AI cross-meeting search */}
            <div className="bg-gradient-to-br from-emerald-950/50 to-emerald-950/20 rounded-2xl p-8 border border-emerald-800/30 hover-lift">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">BRIVA AI — ask anything, anywhere</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                &ldquo;What did Lisa commit to last quarter?&rdquo; — Claude searches every meeting in your workspace and answers with timestamped citations. In-meeting too.
              </p>
            </div>

            {/* Structured summaries */}
            <div className="bg-gradient-to-br from-teal-950/50 to-teal-950/20 rounded-2xl p-8 border border-teal-800/30 hover-lift">
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Summaries that finish themselves</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Overview, key points, decisions, action items with assignees, topics, sentiment — generated by Claude in 18 languages. Every section is editable inline.
              </p>
            </div>

            {/* Tasks & reminders */}
            <div className="bg-gradient-to-br from-blue-950/50 to-blue-950/20 rounded-2xl p-8 border border-blue-800/30 hover-lift">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M5 7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Action items become tasks</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI-extracted action items auto-promote to a workspace Kanban — assigned to the right teammate, with due dates and a daily reminder digest until they&apos;re done.
              </p>
            </div>

            {/* Team workspace */}
            <div className="bg-gradient-to-br from-amber-950/50 to-amber-950/20 rounded-2xl p-8 border border-amber-800/30 hover-lift">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m13-9a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">A workspace, not a folder</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Invite teammates, comment on meetings, share a custom vocabulary so the transcriber stops mangling product names, and switch teams in one click.
              </p>
            </div>

            {/* Share & export */}
            <div className="bg-gradient-to-br from-rose-950/50 to-rose-950/20 rounded-2xl p-8 border border-rose-800/30 hover-lift">
              <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Auto-recap. PDF. Share link.</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Briva auto-emails the recap to every calendar attendee. Export PDF, draft a follow-up email with AI, or share a password-protected read-only link with anyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-emerald-950/15">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">How it works</h2>
          <div className="grid md:grid-cols-4 gap-8 stagger-children">
            {[
              { step: '1', title: 'Capture or upload', desc: 'Record live with the desktop app or upload any audio file' },
              { step: '2', title: 'Auto-transcribe', desc: 'Speakers detected, 30+ languages, no setup' },
              { step: '3', title: 'AI summary & Q&A', desc: 'Structured notes plus ask Claude anything about the meeting' },
              { step: '4', title: 'Share with your team', desc: 'Workspace library, public share links, PDF or email export' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {isLoggedIn ? 'Ready for your next meeting?' : 'Ready to transform your meetings?'}
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            {isLoggedIn ? 'Upload a recording or use the Chrome extension to capture your next meeting.' : 'Start with 100 free minutes every month. No credit card required.'}
          </p>
          {isLoggedIn ? (
            <Link href="/meetings" className="inline-block bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/signup" className="inline-block bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25">
              Get Started Free
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-900/20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
                <rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" />
                <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
                <rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="font-medium text-gray-400">Briva</span>
            <span className="hidden sm:inline text-gray-700">·</span>
            <span className="hidden sm:inline italic text-emerald-500/80">Hear Beyond Words.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-400 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-400 transition">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

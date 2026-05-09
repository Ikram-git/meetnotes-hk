import Link from 'next/link';
import { DemoReel } from '@/components/demo-reel';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#080c0a]">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#080c0a]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
                <rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" />
                <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
                <rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-xl font-bold text-white">Briva</div>
              <div className="text-[10px] font-medium italic text-emerald-400/90 tracking-wide">
                Hear Beyond Words.
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/signup"
              className="text-sm font-medium bg-emerald-500 text-white px-5 py-2 rounded-lg hover:bg-emerald-400 transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Auto-playing demo · 28 seconds
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Watch Briva turn a meeting into action
            </h1>
            <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
              Live transcription, AI summary, ask-anything chat, and team-shared tasks — all in one loop.
            </p>
          </div>

          <DemoReel />

          <div className="text-center mt-12 animate-fade-in-up">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              Ready to try it on a real meeting?
            </h2>
            <Link
              href="/signup"
              className="inline-block bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/30"
            >
              Get Started Free
            </Link>
            <p className="text-xs text-gray-600 mt-3">300 free minutes every month · No credit card</p>
          </div>
        </div>
      </main>
    </div>
  );
}

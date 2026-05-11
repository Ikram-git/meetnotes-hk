import Link from 'next/link';
import { DemoReel } from '@/components/demo-reel';
import { MarketingNav } from '@/components/marketing-nav';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DemoPage() {
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // public page — non-fatal
  }

  return (
    <div className="min-h-screen bg-[#080c0a]">
      <MarketingNav isLoggedIn={isLoggedIn} />

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

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { PricingClient } from './pricing-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pricing — Briva',
  description:
    'Briva pricing — start free with 300 minutes a month. Upgrade to Pro for individuals or Team for shared workspaces, billed per seat.',
};

export default async function PricingPage() {
  let isLoggedIn = false;
  let tier = 'free';
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle();
      tier = profile?.subscription_tier || 'free';
    }
  } catch {
    // Public page — auth failures just mean logged-out viewer.
  }

  return (
    <div className="min-h-screen bg-[#080c0a]">
      {/* Public marketing nav */}
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
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/demo" className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition px-2 sm:px-4 py-2 hidden sm:block">
              Demo
            </Link>
            <ThemeToggle />
            {isLoggedIn ? (
              <Link
                href="/meetings"
                className="text-xs sm:text-sm font-medium bg-emerald-500 text-white px-3 sm:px-5 py-2 rounded-lg hover:bg-emerald-400 transition"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition px-2 sm:px-4 py-2"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="text-xs sm:text-sm font-medium bg-emerald-500 text-white px-3 sm:px-5 py-2 rounded-lg hover:bg-emerald-400 transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-5">
              Simple, scaling pricing
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Pricing that scales with your team
            </h1>
            <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
              Start free with <span className="text-white font-medium">300 minutes</span> a month. Upgrade to Pro for individual heavy use, or Team for shared workspaces, billed per seat.
            </p>
          </div>

          <PricingClient isLoggedIn={isLoggedIn} initialTier={tier} />

          {/* FAQ-style reassurance */}
          <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-sm">
            <div>
              <h3 className="font-semibold text-white mb-2">What counts as a minute?</h3>
              <p className="text-gray-500 leading-relaxed">
                One minute of audio transcribed. Re-running a summary or asking BRIVA AI questions doesn&apos;t use any minutes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Can I switch plans later?</h3>
              <p className="text-gray-500 leading-relaxed">
                Yes — upgrade, downgrade, or cancel at any time from billing settings. Changes prorate automatically.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Need more than Team?</h3>
              <p className="text-gray-500 leading-relaxed">
                Enterprise plans include SSO, custom retention, audit logs, and a dedicated success manager. <a href="mailto:sales@meetbriva.com" className="text-emerald-400 hover:text-emerald-300">Contact sales</a>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-emerald-900/20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-400">Briva</span>
            <span className="hidden sm:inline text-gray-700">·</span>
            <span className="hidden sm:inline italic text-emerald-500/80">Hear Beyond Words.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-gray-400 transition">Home</Link>
            <Link href="/demo" className="hover:text-gray-400 transition">Demo</Link>
            <Link href="/privacy" className="hover:text-gray-400 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-400 transition">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

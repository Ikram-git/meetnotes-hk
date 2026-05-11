import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MarketingNav } from '@/components/marketing-nav';
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
      <MarketingNav isLoggedIn={isLoggedIn} />

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

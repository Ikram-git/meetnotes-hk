'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingTable } from '@/components/pricing-table';
import { PLANS } from '@/lib/billing/plans';

export function PricingClient({
  isLoggedIn,
  initialTier,
}: {
  isLoggedIn: boolean;
  initialTier: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleSelectPlan = async (planId: string, interval: 'monthly' | 'yearly') => {
    if (!isLoggedIn) {
      // Send them to signup; remember which plan they wanted so we can
      // route into checkout on the other side (Stripe checkout requires a
      // user; can't do this without auth).
      router.push(`/signup?plan=${planId}&interval=${interval}`);
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Checkout failed');
    } catch {
      alert('Checkout failed');
    }
    setLoading(null);
  };

  const isSubscribed = isLoggedIn && initialTier !== 'free';
  const currentPlan = PLANS.find((p) => p.id === initialTier);

  if (isSubscribed && currentPlan) {
    return (
      <div className="max-w-md mx-auto bg-[#111916] rounded-xl border border-emerald-900/30 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{currentPlan.name}</h3>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              initialTier === 'team'
                ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20'
                : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
            }`}
          >
            ACTIVE
          </span>
        </div>

        <div className="mb-5">
          <span className="text-3xl font-bold text-white">${currentPlan.price}</span>
          <span className="text-sm text-gray-500">/month</span>
        </div>

        <ul className="space-y-2.5 mb-6">
          {currentPlan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
              <svg
                className="w-4 h-4 text-emerald-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={() => router.push('/settings/billing')}
          className="w-full py-2.5 text-sm font-medium bg-white/5 text-white border border-emerald-900/30 rounded-lg hover:bg-white/10 transition"
        >
          Manage Subscription
        </button>

        {initialTier === 'pro' && (
          <button
            onClick={() => handleSelectPlan('team', 'monthly')}
            disabled={!!loading}
            className="w-full mt-3 py-2.5 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition disabled:opacity-50"
          >
            {loading === 'team' ? 'Redirecting...' : 'Upgrade to Team'}
          </button>
        )}
      </div>
    );
  }

  return (
    <PricingTable
      currentTier={initialTier}
      onSelectPlan={handleSelectPlan}
      loading={loading}
    />
  );
}

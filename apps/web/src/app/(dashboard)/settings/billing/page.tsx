'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UsageMeter } from '@/components/usage-meter';
import { PricingTable } from '@/components/pricing-table';
import { SettingsNav } from '@/components/settings-nav';
import { PLANS } from '@/lib/billing/plans';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [usage, setUsage] = useState({ minutesUsed: 0, minutesLimit: 100, tier: 'free', percentUsed: 0 });

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        try {
          await fetch('/api/billing/sync', { method: 'POST' });
        } catch {}
        window.history.replaceState({}, '', '/settings/billing');
      }

      try {
        const res = await fetch('/api/billing/usage');
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const handleSelectPlan = async (planId: string, interval: 'monthly' | 'yearly') => {
    setUpgradeLoading(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch {
      alert('Failed to start checkout');
    }
    setUpgradeLoading(null);
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Billing portal not available');
      }
    } catch {
      alert('Failed to open billing portal');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  );

  const currentPlan = PLANS.find(p => p.id === usage.tier);
  const isSubscribed = usage.tier !== 'free';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Billing & usage</p>
        <SettingsNav />
      </div>

      <div className="max-w-4xl space-y-8">
        {/* Usage */}
        <UsageMeter minutesUsed={usage.minutesUsed} minutesLimit={usage.minutesLimit} tier={usage.tier} />

        {isSubscribed && currentPlan ? (
          <>
            {/* Active Subscription Card */}
            <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
              <div className="px-6 py-4 border-b border-emerald-900/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Your Subscription</h3>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  usage.tier === 'team'
                    ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20'
                    : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                }`}>
                  {currentPlan.name.toUpperCase()}
                </span>
              </div>
              <div className="p-6 space-y-5">
                {/* Plan details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Plan</p>
                    <p className="text-sm font-medium text-white">{currentPlan.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Monthly Limit</p>
                    <p className="text-sm font-medium text-white">{currentPlan.minutesLimit.toLocaleString()} minutes</p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Included Features</p>
                  <ul className="grid grid-cols-2 gap-2">
                    {currentPlan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 border-t border-emerald-900/20">
                  <button onClick={handleManageBilling}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-emerald-900/30 rounded-lg hover:bg-white/10 transition">
                    Manage Subscription
                  </button>
                  <p className="text-xs text-gray-600">Update payment method, change plan, or cancel</p>
                </div>
              </div>
            </div>

            {/* Upgrade option for Pro users */}
            {usage.tier === 'pro' && (
              <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Need more?</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Upgrade to Team for 10,000 minutes/month, shared library, and admin controls.</p>
                  </div>
                  <button onClick={() => handleSelectPlan('team', 'monthly')} disabled={!!upgradeLoading}
                    className="px-4 py-2 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition disabled:opacity-50 whitespace-nowrap">
                    {upgradeLoading === 'team' ? 'Redirecting...' : 'Upgrade to Team'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Free user — show pricing table */
          <div>
            <h2 className="text-lg font-semibold text-white mb-6 text-center">Upgrade Your Plan</h2>
            <PricingTable currentTier={usage.tier} onSelectPlan={handleSelectPlan} loading={upgradeLoading} />
          </div>
        )}
      </div>
    </div>
  );
}

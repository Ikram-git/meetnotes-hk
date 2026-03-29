'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UsageMeter } from '@/components/usage-meter';
import { PricingTable } from '@/components/pricing-table';
import { SettingsNav } from '@/components/settings-nav';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [usage, setUsage] = useState({ minutesUsed: 0, minutesLimit: 300, tier: 'free' });

  useEffect(() => {
    async function load() {
      // If returning from Stripe checkout, sync subscription first
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        try {
          await fetch('/api/billing/sync', { method: 'POST' });
        } catch {}
        // Clean up URL
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

        {/* Manage existing subscription */}
        {usage.tier !== 'free' && (
          <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white capitalize">{usage.tier} Plan</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage your subscription, update payment method, or cancel</p>
              </div>
              <button onClick={handleManageBilling}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-emerald-900/30 rounded-lg hover:bg-white/10 transition">
                Manage Subscription
              </button>
            </div>
          </div>
        )}

        {/* Pricing */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-6 text-center">
            {usage.tier === 'free' ? 'Upgrade Your Plan' : 'Available Plans'}
          </h2>
          <PricingTable currentTier={usage.tier} onSelectPlan={handleSelectPlan} loading={upgradeLoading} />
        </div>
      </div>
    </div>
  );
}

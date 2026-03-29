'use client';

import { useState, useEffect } from 'react';
import { PricingTable } from '@/components/pricing-table';

export default function PricingPage() {
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/usage').then(r => r.json()).then(d => setTier(d.tier || 'free')).catch(() => {});
  }, []);

  const handleSelectPlan = async (planId: string, interval: 'monthly' | 'yearly') => {
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
    } catch { alert('Checkout failed'); }
    setLoading(null);
  };

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white">Simple, transparent pricing</h1>
        <p className="text-sm text-gray-500 mt-2">Start free, upgrade when you need more</p>
      </div>
      <PricingTable currentTier={tier} onSelectPlan={handleSelectPlan} loading={loading} />
    </div>
  );
}

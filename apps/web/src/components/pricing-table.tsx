'use client';

import { useState } from 'react';
import { PLANS, type Plan } from '@/lib/billing/plans';

interface PricingTableProps {
  currentTier?: string;
  onSelectPlan?: (planId: string, interval: 'monthly' | 'yearly') => void;
  loading?: string | null;
}

export function PricingTable({ currentTier = 'free', onSelectPlan, loading }: PricingTableProps) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div>
      {/* Interval toggle */}
      <div className="flex justify-center mb-10">
        <div className="flex items-center bg-white/5 border border-emerald-900/30 rounded-lg p-1">
          <button
            onClick={() => setInterval('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              interval === 'monthly' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              interval === 'yearly' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Yearly <span className="text-emerald-400 text-xs ml-1">Save ~17%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={interval}
            isCurrent={currentTier === plan.id}
            loading={loading}
            onSelectPlan={onSelectPlan}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-gray-600 max-w-2xl mx-auto">
        Team plan is billed per seat — every workspace member counts as one seat. You can add or remove seats anytime
        in your billing portal. Yearly plans are billed up-front and save ~17% vs. monthly.
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  isCurrent,
  loading,
  onSelectPlan,
}: {
  plan: Plan;
  interval: 'monthly' | 'yearly';
  isCurrent: boolean;
  loading?: string | null;
  onSelectPlan?: (planId: string, interval: 'monthly' | 'yearly') => void;
}) {
  if (plan.contactOnly) {
    return (
      <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-6 flex flex-col">
        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">{plan.tagline}</p>
        <div className="mb-5">
          <span className="text-2xl font-bold text-white">Custom</span>
          <p className="text-xs text-gray-600 mt-1">Talk to us about pricing</p>
        </div>
        <ul className="space-y-2 mb-6 flex-1">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
        <a
          href="mailto:sales@meetbriva.com?subject=Briva%20Enterprise%20enquiry"
          className="w-full text-center py-2.5 text-sm font-medium bg-white/5 text-white border border-emerald-900/30 rounded-lg hover:bg-white/10 transition"
        >
          Contact sales
        </a>
      </div>
    );
  }

  const yearlyMonthly = plan.priceYearly > 0 ? Math.round(plan.priceYearly / 12) : 0;
  const monthlyDisplay = interval === 'yearly' ? yearlyMonthly : plan.price;
  const savingsLabel = interval === 'yearly' && plan.price > 0
    ? `Billed $${plan.priceYearly}${plan.perSeat ? '/seat' : ''}/year`
    : null;

  return (
    <div
      className={`bg-[#111916] rounded-xl border p-6 flex flex-col relative ${
        plan.highlighted
          ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
          : 'border-emerald-900/30'
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium text-white bg-emerald-500 rounded-full px-3 py-0.5">
          Most popular
        </div>
      )}

      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">{plan.tagline}</p>

      <div className="mb-5">
        {plan.price === 0 ? (
          <>
            <span className="text-3xl font-bold text-white">Free</span>
            <p className="text-xs text-gray-600 mt-1">Forever, no card</p>
          </>
        ) : (
          <>
            <span className="text-3xl font-bold text-white">${monthlyDisplay}</span>
            <span className="text-sm text-gray-500">
              {plan.perSeat ? '/seat/month' : '/month'}
            </span>
            {savingsLabel && (
              <p className="text-xs text-gray-600 mt-1">{savingsLabel}</p>
            )}
          </>
        )}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button disabled className="w-full py-2.5 text-sm font-medium text-gray-500 bg-white/5 border border-gray-800 rounded-lg">
          Current plan
        </button>
      ) : plan.price === 0 ? (
        <button disabled className="w-full py-2.5 text-sm font-medium text-gray-500 bg-white/5 border border-gray-800 rounded-lg">
          Free forever
        </button>
      ) : (
        <button
          onClick={() => onSelectPlan?.(plan.id, interval)}
          disabled={!!loading}
          className={`w-full py-2.5 text-sm font-medium rounded-lg transition disabled:opacity-50 ${
            plan.highlighted
              ? 'bg-emerald-500 text-white hover:bg-emerald-400'
              : 'bg-white/5 text-white border border-emerald-900/30 hover:bg-white/10'
          }`}
        >
          {loading === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
        </button>
      )}
    </div>
  );
}

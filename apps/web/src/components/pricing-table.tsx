'use client';

import { useState } from 'react';
import { PLANS } from '@/lib/billing/plans';

interface PricingTableProps {
  currentTier?: string;
  onSelectPlan?: (planId: string, interval: 'monthly' | 'yearly') => void;
  loading?: string | null;
}

export function PricingTable({ currentTier = 'free', onSelectPlan, loading }: PricingTableProps) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div>
      {/* Interval toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center bg-white/5 border border-emerald-900/30 rounded-lg p-1">
          <button onClick={() => setInterval('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              interval === 'monthly' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}>
            Monthly
          </button>
          <button onClick={() => setInterval('yearly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              interval === 'yearly' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}>
            Yearly <span className="text-emerald-400 text-xs ml-1">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {PLANS.map((plan) => {
          const price = interval === 'yearly' ? plan.priceYearly : plan.price;
          const monthlyPrice = interval === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.price;
          const isCurrent = currentTier === plan.id;

          return (
            <div key={plan.id}
              className={`bg-[#111916] rounded-xl border p-6 flex flex-col ${
                plan.highlighted
                  ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                  : 'border-emerald-900/30'
              }`}>
              {plan.highlighted && (
                <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 self-start mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <div className="mt-3 mb-5">
                <span className="text-3xl font-bold text-white">${monthlyPrice}</span>
                <span className="text-sm text-gray-500">/month</span>
                {interval === 'yearly' && plan.price > 0 && (
                  <p className="text-xs text-gray-600 mt-1">Billed ${price}/year</p>
                )}
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button disabled className="w-full py-2.5 text-sm font-medium text-gray-500 bg-white/5 border border-gray-800 rounded-lg">
                  Current Plan
                </button>
              ) : plan.price === 0 ? (
                <button disabled className="w-full py-2.5 text-sm font-medium text-gray-500 bg-white/5 border border-gray-800 rounded-lg">
                  Free Forever
                </button>
              ) : (
                <button
                  onClick={() => onSelectPlan?.(plan.id, interval)}
                  disabled={!!loading}
                  className={`w-full py-2.5 text-sm font-medium rounded-lg transition disabled:opacity-50 ${
                    plan.highlighted
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                      : 'bg-white/5 text-white border border-emerald-900/30 hover:bg-white/10'
                  }`}>
                  {loading === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

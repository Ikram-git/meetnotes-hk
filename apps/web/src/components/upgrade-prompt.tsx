'use client';

import Link from 'next/link';

interface UpgradePromptProps {
  currentTier: string;
  message?: string;
}

export function UpgradePrompt({ currentTier, message }: UpgradePromptProps) {
  if (currentTier !== 'free') return null;

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Upgrade to Pro</h3>
          <p className="text-xs text-gray-400 mt-1">
            {message || 'Get 3,000 minutes/month, email export, priority transcription, and more.'}
          </p>
          <Link href="/settings/billing"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-400 transition">
            View Plans
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

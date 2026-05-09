'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isTauri } from '@/lib/tauri';

export function HeroCtas({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [desktop, setDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDesktop(isTauri());
    setMounted(true);
  }, []);

  return (
    <>
      {/* Hide download CTA when running inside the desktop app — they
          already have it. Render it by default during SSR so non-JS
          crawlers see it; the useEffect flips state on mount in Tauri. */}
      {(!mounted || !desktop) && (
        <a
          href="https://github.com/Ikram-git/briva-releases/releases/latest/download/Briva_x64_en-US.msi"
          className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25 whitespace-nowrap"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
          </svg>
          Download
        </a>
      )}
      {isLoggedIn ? (
        <Link
          href="/meetings"
          className={`text-center px-5 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap ${
            mounted && desktop
              ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25'
              : 'text-gray-300 hover:bg-white/5 border border-gray-800 hover:border-gray-700'
          }`}
        >
          Open dashboard
        </Link>
      ) : (
        <Link
          href="/signup"
          className={`text-center px-5 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap ${
            mounted && desktop
              ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25'
              : 'text-gray-300 hover:bg-white/5 border border-gray-800 hover:border-gray-700'
          }`}
        >
          {mounted && desktop ? 'Get started' : 'Use the web app'}
        </Link>
      )}
    </>
  );
}

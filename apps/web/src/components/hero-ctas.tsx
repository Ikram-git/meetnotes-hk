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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        {/* Hide download CTA when running inside the desktop app — they
            already have it. Render it by default during SSR so non-JS
            crawlers see it; the useEffect flips state on mount in Tauri. */}
        {(!mounted || !desktop) && (
          <a
            href="https://github.com/Ikram-git/briva-releases/releases/latest/download/Briva_x64_en-US.msi"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
            </svg>
            Download for Windows
          </a>
        )}
        {isLoggedIn ? (
          <Link
            href="/meetings"
            className={`w-full sm:w-auto text-center px-6 py-3.5 rounded-xl text-base font-medium transition ${
              mounted && desktop
                ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25'
                : 'text-gray-300 hover:bg-white/5 border border-gray-800 hover:border-gray-700'
            }`}
          >
            Open Dashboard
          </Link>
        ) : (
          <Link
            href="/signup"
            className={`w-full sm:w-auto text-center px-6 py-3.5 rounded-xl text-base font-medium transition ${
              mounted && desktop
                ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25'
                : 'text-gray-300 hover:bg-white/5 border border-gray-800 hover:border-gray-700'
            }`}
          >
            {mounted && desktop ? 'Get Started' : 'Use the web app'}
          </Link>
        )}
      </div>

      {(!mounted || !desktop) && (
        <p className="mt-5 text-xs text-gray-600 max-w-md mx-auto">
          Free · Windows 10/11 · macOS coming soon. <br className="sm:hidden" />
          On first launch, click <span className="text-gray-400">More info</span> &rarr;{' '}
          <span className="text-gray-400">Run anyway</span> if SmartScreen warns &mdash; build is unsigned during beta.
        </p>
      )}
    </>
  );
}

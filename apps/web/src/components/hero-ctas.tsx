'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isTauri } from '@/lib/tauri';

const WIN_URL =
  'https://github.com/Ikram-git/briva-releases/releases/latest/download/Briva_x64_en-US.msi';
const MAC_URL =
  'https://github.com/Ikram-git/briva-releases/releases/latest/download/Briva_universal.dmg';

type Platform = 'mac' | 'windows';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  if (/mac/.test(platform) || /mac os/.test(ua)) return 'mac';
  return 'windows';
}

const winIcon = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
  </svg>
);
const macIcon = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

export function HeroCtas({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [desktop, setDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<Platform>('windows');

  useEffect(() => {
    setDesktop(isTauri());
    setPlatform(detectPlatform());
    setMounted(true);
  }, []);

  const isMac = mounted && platform === 'mac';
  const primaryUrl = isMac ? MAC_URL : WIN_URL;
  const primaryIcon = isMac ? macIcon : winIcon;
  const primaryLabel = isMac ? 'Download for Mac' : 'Download for Windows';
  const secondaryUrl = isMac ? WIN_URL : MAC_URL;
  const secondaryIcon = isMac ? winIcon : macIcon;
  const secondaryLabel = isMac ? 'Windows' : 'Mac';

  const PRIMARY_CLS =
    'inline-flex items-center justify-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25 whitespace-nowrap';
  const SECONDARY_CLS =
    'inline-flex items-center justify-center gap-2 text-gray-300 hover:bg-white/5 border border-gray-800 hover:border-gray-700 px-5 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap';

  return (
    <>
      {/* Hide download CTAs when running inside the desktop app — they
          already have it. Render the primary by default during SSR so
          non-JS crawlers see it; the useEffect flips state on mount. */}
      {(!mounted || !desktop) && (
        <>
          <a href={primaryUrl} className={PRIMARY_CLS}>
            {primaryIcon}
            {mounted ? primaryLabel : 'Download'}
          </a>
          {mounted && (
            <a href={secondaryUrl} className={SECONDARY_CLS}>
              {secondaryIcon}
              For {secondaryLabel}
            </a>
          )}
        </>
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

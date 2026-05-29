'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { BookDemoDialog } from './book-demo-dialog';

/**
 * Shared marketing-site top bar. Used on landing, pricing, /demo,
 * /security — anywhere we want a public, auth-aware nav with a
 * mobile hamburger menu that surfaces every link (not just the
 * desktop subset).
 */
export function MarketingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bookDemoOpen, setBookDemoOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the menu is open.
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const links: Array<{ href: string; label: string }> = [
    { href: '/demo', label: 'Briva in action' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/security', label: 'Security' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#080c0a]/80 backdrop-blur-md border-b border-emerald-900/30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
              <rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" />
              <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
              <rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <div className="text-xl font-bold text-white">Briva</div>
              <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500/70 border border-emerald-500/20">
                Beta
              </span>
            </div>
            <div className="text-[10px] font-medium italic text-emerald-400/90 tracking-wide">
              Hear Beyond Words.
            </div>
          </div>
        </Link>

        {/* Desktop links — md+ */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition px-3 py-2 ${
                  active ? 'text-emerald-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setBookDemoOpen(true)}
            className="text-sm font-medium text-gray-400 hover:text-white transition px-3 py-2 hidden lg:inline-block"
          >
            Book a demo
          </button>
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              href="/meetings"
              className="ml-1 text-sm font-medium bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-400 transition"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-400 hover:text-white transition px-3 py-2"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="ml-1 text-sm font-medium bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-400 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile — hamburger + theme toggle */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <BookDemoDialog open={bookDemoOpen} onClose={() => setBookDemoOpen(false)} />

      {/* Mobile slide-down sheet */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 left-0 right-0 bg-[#111916] border-b border-emerald-900/30 shadow-2xl">
            <div className="px-6 h-16 flex items-center justify-between border-b border-emerald-900/20">
              <span className="text-base font-bold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="px-4 py-3 space-y-0.5">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center px-3 py-3 rounded-lg text-base font-medium transition ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setBookDemoOpen(true);
                }}
                className="w-full text-left mt-1 flex items-center px-3 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                Book a demo
              </button>
            </nav>
            <div className="border-t border-emerald-900/20 px-4 py-4 space-y-2">
              {isLoggedIn ? (
                <Link
                  href="/meetings"
                  className="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-lg text-sm font-semibold transition"
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full text-center text-gray-300 hover:text-white py-3 rounded-lg text-sm font-medium border border-gray-800 hover:border-emerald-500/40 transition"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-lg text-sm font-semibold transition"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

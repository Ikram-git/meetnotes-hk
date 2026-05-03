'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme-provider';
import { isTauri } from '@/lib/tauri';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { UploadProvider, useUpload } from '@/components/upload-provider';
import { ConfirmHost } from '@/components/confirm-dialog';
import { RouteProgress } from '@/components/route-progress';
import { Suspense } from 'react';

const navItems: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: '/meetings',
    label: 'Home',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/upload',
    label: 'Upload',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    href: '/settings/team',
    label: 'Team',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m13-9a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/pricing',
    label: 'Pricing',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UploadProvider>
      <ConfirmHost />
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </UploadProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const upload = useUpload();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userTier, setUserTier] = useState('free');
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [minutesLimit, setMinutesLimit] = useState(100);
  const [desktop, setDesktop] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setDesktop(isTauri());
  }, []);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || '');
      setUserName(user.user_metadata?.full_name || '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, minutes_used_this_month, minutes_limit')
        .eq('id', user.id)
        .single();
      if (profile) {
        setUserTier(profile.subscription_tier || 'free');
        setMinutesUsed(profile.minutes_used_this_month || 0);
        setMinutesLimit(profile.minutes_limit || 100);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = userName
    ? userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail ? userEmail[0].toUpperCase() : '?';

  const usagePct = Math.min(100, Math.round((minutesUsed / Math.max(minutesLimit, 1)) * 100));

  const sidebar = (
    <>
      <Link href="/meetings" className="flex items-center gap-2 px-4 pt-5 pb-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
            <rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" />
            <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
            <rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <span className="text-lg font-bold text-white">Briva</span>
      </Link>

      <div className="px-3 pb-3">
        <WorkspaceSwitcher />
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/meetings'
              ? pathname === '/meetings' || pathname.startsWith('/meetings/')
              : item.href === '/settings/team'
              ? pathname.startsWith('/settings/team')
              : item.href === '/settings'
              ? pathname === '/settings' || pathname.startsWith('/settings/billing')
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-emerald-900/20">
        <div className="bg-white/5 rounded-xl p-3 border border-emerald-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white capitalize">{userTier === 'free' ? 'Basic' : userTier} plan</span>
            {userTier !== 'free' && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                userTier === 'team'
                  ? 'text-purple-400 bg-purple-500/10'
                  : 'text-amber-400 bg-amber-500/10'
              }`}>
                {userTier.toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500 mb-2">
            {minutesUsed} of {minutesLimit} monthly mins used
          </div>
          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {userTier === 'free' && (
            <Link
              href="/pricing"
              className="block w-full text-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition py-1.5 rounded-lg text-xs font-medium"
            >
              Try Pro for free
            </Link>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#080c0a] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 sticky top-0 h-screen flex-col border-r border-emerald-900/30 bg-[#0a0f0d]">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 w-64 z-50 flex flex-col border-r border-emerald-900/30 bg-[#0a0f0d]">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 sm:px-6 bg-[#0a0f0d]/80 backdrop-blur-md border-b border-emerald-900/30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden text-gray-400 hover:text-white"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {desktop && (
              <>
                <Link
                  href="/record-live"
                  className="hidden sm:flex items-center gap-1.5 bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-400 transition"
                  title="Live transcription (beta)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </Link>
                <Link
                  href="/upload?record=1"
                  className="hidden sm:flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-400 transition"
                  title="Record system audio"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Record
                </Link>
              </>
            )}
            <button
              onClick={upload.open}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-400 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Meeting
            </button>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              {theme === 'dark' ? (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-semibold hover:bg-emerald-500/30 transition"
              >
                {initials}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#111916] rounded-xl shadow-xl border border-emerald-900/30 py-1 z-50">
                  <div className="px-4 py-3 border-b border-emerald-900/20">
                    <div className="flex items-center gap-2">
                      {userName && <p className="text-sm font-medium text-white">{userName}</p>}
                      {userTier !== 'free' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          userTier === 'team'
                            ? 'text-purple-400 bg-purple-500/10'
                            : 'text-amber-400 bg-amber-500/10'
                        }`}>
                          {userTier.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Visit homepage
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6">{children}</main>

        <footer className="border-t border-emerald-900/20">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-gray-600">
            <span>Briva</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-gray-400 transition">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-400 transition">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

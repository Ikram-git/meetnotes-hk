'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/billing', label: 'Billing' },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mt-4">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

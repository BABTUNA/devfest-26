'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical, Store, ChartNoAxesCombined, Gauge } from 'lucide-react';
import { TokenBalance } from './TokenBalance';
import { TokenPurchaseModal } from './TokenPurchaseModal';
import { UserDropdown } from './UserDropdown';

const NAV = [
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/lab', label: 'Lab', icon: FlaskConical },
  { href: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { href: '/usage', label: 'Usage', icon: Gauge },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 shrink-0 border-b border-app bg-app-surface/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-app-fg md:text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 md:h-5 md:w-5">
              <path d="m11 17 2 2a1 1 0 1 0 3-3"/>
              <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/>
              <path d="m21 3 1 11h-2"/>
              <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/>
              <path d="M3 4h8"/>
            </svg>
            Handi
          </Link>

          <nav className="ml-2 flex items-center gap-1 overflow-x-auto">
            {NAV.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-app-accent/20 text-blue-700 dark:text-blue-200'
                      : 'text-app-soft hover:bg-app-surface hover:text-app-fg'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <TokenBalance onClick={() => setShowPurchaseModal(true)} />
            <UserDropdown />
          </div>
        </div>
      </header>
      <TokenPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />
    </>
  );
}

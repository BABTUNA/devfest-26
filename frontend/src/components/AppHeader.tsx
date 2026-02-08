'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical, Store, ShoppingCart, User, MoonStar, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { TokenBalance } from './TokenBalance';
import { TokenPurchaseModal } from './TokenPurchaseModal';

const NAV = [
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/lab', label: 'Lab', icon: FlaskConical },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 shrink-0 border-b border-app bg-app-surface/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="text-base font-semibold tracking-tight text-app-fg md:text-lg">
            Handi
          </Link>

          <nav className="ml-2 flex items-center gap-1 overflow-x-auto">
            {NAV.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                      ? 'bg-app-accent/20 text-blue-300 dark:text-blue-200'
                      : 'text-app-soft hover:bg-app-surface hover:text-app-fg'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <TokenBalance onClick={() => setShowPurchaseModal(true)} />
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <span className="hidden rounded-lg border border-app px-3 py-2 text-xs text-app-soft md:inline">
              demo-user-2
            </span>
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

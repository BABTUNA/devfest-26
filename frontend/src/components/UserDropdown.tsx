'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, CreditCard, Monitor, MoonStar, Settings, Sun, User } from 'lucide-react';
import { useAppBilling } from '@/contexts/AppBillingContext';
import { useTheme } from '@/contexts/ThemeContext';

const THEME_OPTIONS = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'dark' as const, icon: MoonStar, label: 'Dark' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
] as const;

const MENU_ITEMS = [
  { href: '/account', label: 'Account', icon: User },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function UserDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { customer } = useAppBilling();
  const { theme, setTheme } = useTheme();

  const displayName = customer?.name ?? 'Demo user';
  const email = customer?.email ?? 'demo@example.com';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-app px-2 py-1.5 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-app-accent text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">{displayName}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-app bg-app-surface py-1 shadow-xl backdrop-blur">
          <div className="border-b border-app px-4 py-3">
            <p className="text-sm font-medium text-app-fg">{displayName}</p>
            <p className="text-xs text-app-soft">{email}</p>
          </div>

          <div className="py-1">
            {MENU_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-app-accent/10 text-blue-700 dark:text-blue-300'
                      : 'text-app-fg hover:bg-app-card'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-app px-3 py-2.5">
            <p className="mb-2 text-xs font-medium text-app-soft">Theme</p>
            <div className="flex gap-1 rounded-lg border border-app bg-app p-0.5">
              {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  title={label}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                    theme === value
                      ? 'bg-app-surface text-app-fg shadow-sm'
                      : 'text-app-soft hover:text-app-fg'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

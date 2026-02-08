'use client';

import { useState } from 'react';
import { Sun, MoonStar, Monitor, Palette, Bell, Shield, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppBilling } from '@/contexts/AppBillingContext';
import { useTokens } from '@/contexts/TokenContext';
import { Lock, Unlock } from 'lucide-react';
import { resetDemoState, unlockDemoState } from '@/lib/api';

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors ${enabled ? 'border-blue-600 bg-blue-600' : 'border-app bg-app-card'
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { customer } = useAppBilling();
  const { refresh: refreshEntitlements } = useTokens();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [usageAlerts, setUsageAlerts] = useState(true);
  const [billingReminders, setBillingReminders] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetDemo = async () => {
    if (!confirm('Are you sure? This will lock all features and reset tokens to 0.')) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      const result = await resetDemoState();
      await refreshEntitlements();
      setResetMessage(result.message);
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : 'Failed to reset demo state');
    } finally {
      setResetLoading(false);
    }
  };

  const handleUnlockDemo = async () => {
    setUnlockLoading(true);
    setResetMessage(null);
    try {
      const result = await unlockDemoState();
      await refreshEntitlements();
      setResetMessage(result.message);
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : 'Failed to unlock demo state');
    } finally {
      setUnlockLoading(false);
    }
  };

  const displayName = customer?.name ?? 'Demo user';
  const email = customer?.email ?? 'demo@example.com';

  const themeOptions = [
    { value: 'dark' as const, label: 'Dark', icon: MoonStar },
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Settings</h1>
      <p className="mt-1 text-sm text-app-soft">
        Configure your preferences and application settings.
      </p>

      <div className="mt-6 space-y-6">
        <section className="rounded-xl border border-app bg-app-surface p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-app-fg">
            <Palette className="h-5 w-5 text-app-soft" />
            Appearance
          </h2>
          <p className="mt-1 text-sm text-app-soft">
            Choose how the application looks and feels.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const isActive = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${isActive
                    ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-500/5'
                    : 'border-app bg-app-surface hover:border-blue-500/50'
                    }`}
                >
                  <Icon className="h-6 w-6 text-app-fg" />
                  <span className="text-sm font-medium text-app-fg">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-app bg-app-surface p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-app-fg">
            <Bell className="h-5 w-5 text-app-soft" />
            Notifications
          </h2>
          <p className="mt-1 text-sm text-app-soft">
            Manage how you receive notifications and alerts.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-app-fg">Email notifications</p>
                <p className="text-xs text-app-soft">
                  Receive updates about your account via email.
                </p>
              </div>
              <Toggle enabled={emailNotifs} onToggle={() => setEmailNotifs((p) => !p)} />
            </div>

            <div className="border-t border-app" />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-app-fg">Usage alerts</p>
                <p className="text-xs text-app-soft">
                  Get notified when approaching usage limits.
                </p>
              </div>
              <Toggle enabled={usageAlerts} onToggle={() => setUsageAlerts((p) => !p)} />
            </div>

            <div className="border-t border-app" />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-app-fg">Billing reminders</p>
                <p className="text-xs text-app-soft">
                  Receive reminders before subscription renewals.
                </p>
              </div>
              <Toggle
                enabled={billingReminders}
                onToggle={() => setBillingReminders((p) => !p)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-app bg-app-surface p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-app-fg">
            <Shield className="h-5 w-5 text-app-soft" />
            Account
          </h2>
          <p className="mt-1 text-sm text-app-soft">Your account information.</p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-app-soft">Name</p>
                <p className="mt-0.5 text-sm text-app-fg">{displayName}</p>
              </div>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg border border-app px-3 py-1.5 text-xs text-app-soft opacity-50"
              >
                Edit
              </button>
            </div>

            <div className="border-t border-app" />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-app-soft">Email</p>
                <p className="mt-0.5 text-sm text-app-fg">{email}</p>
              </div>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg border border-app px-3 py-1.5 text-xs text-app-soft opacity-50"
              >
                Edit
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-app-surface p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-app-fg">
            <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            Danger Zone
          </h2>
          <p className="mt-1 text-sm text-app-soft">
            Irreversible actions that affect your account.
          </p>



          // ... inside Danger Zone section ...
          <div className="mt-5">
            <p className="text-sm text-app-soft">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            <button
              type="button"
              disabled
              className="mt-3 cursor-not-allowed rounded-lg border border-rose-400 dark:border-rose-500/50 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 opacity-50 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              Delete Account
            </button>

            <div className="mt-8 border-t border-rose-300/50 dark:border-rose-500/30 pt-6">
              <h3 className="text-sm font-medium text-app-fg">Demo Controls</h3>
              <p className="mt-1 text-xs text-app-soft">
                Manage your demo state. "Hard Reset" simulates a locked user state (0 tokens, no entitlements). "Unlock" restores access.
              </p>

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleResetDemo()}
                  disabled={resetLoading || unlockLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-400 dark:border-amber-500/50 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 transition hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <Lock className={`h-4 w-4 ${resetLoading ? 'animate-spin' : ''}`} />
                  {resetLoading ? 'Resetting...' : 'Hard Reset (Lock All)'}
                </button>

                <button
                  type="button"
                  onClick={() => void handleUnlockDemo()}
                  disabled={resetLoading || unlockLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-400 dark:border-blue-500/50 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 transition hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-50"
                >
                  <Unlock className={`h-4 w-4 ${unlockLoading ? 'animate-pulse' : ''}`} />
                  {unlockLoading ? 'Unlocking...' : 'Unlock Features'}
                </button>
              </div>

              {resetMessage && (
                <p className={`mt-2 text-xs font-medium ${resetMessage.includes('Failed') ? 'text-rose-500' : 'text-emerald-500'
                  }`}>
                  {resetMessage}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

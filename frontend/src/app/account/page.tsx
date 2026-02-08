'use client';

import { useMemo } from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { BLOCK_DEFINITIONS } from 'shared';
import { useAppBilling } from '@/contexts/AppBillingContext';
import { useExecutionLog } from '@/store/executionLog';

export default function AccountPage() {
  const {
    loaded,
    customer,
    entitlements,
    entitlementsLoading,
    refreshEntitlements,
  } = useAppBilling();

  const entries = useExecutionLog((state) => state.entries);

  const usageByBlock = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      map.set(entry.blockId, (map.get(entry.blockId) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const unlockedBlocks = useMemo(() => {
    return BLOCK_DEFINITIONS.filter(
      (block) => block.featureSlug === 'free' || entitlements[block.featureSlug]
    ).length;
  }, [entitlements]);

  if (!loaded) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 text-sm text-app-soft md:px-6">
        Loading account&hellip;
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Account</h1>
      <p className="mt-1 text-sm text-app-soft">
        Manage your account, track entitlements and usage.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-app bg-app-surface p-4">
          <p className="text-xs uppercase tracking-wide text-app-soft">User</p>
          <p className="mt-2 text-sm font-medium text-app-fg">
            {customer?.name ?? 'Demo user'}
          </p>
          <p className="text-sm text-app-soft">{customer?.email ?? 'demo@example.com'}</p>
        </div>

        <div className="rounded-xl border border-app bg-app-surface p-4">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-app-soft">
            <ShieldCheck className="h-3.5 w-3.5" />
            Entitlements
          </p>
          <p className="mt-2 text-sm font-medium text-app-fg">
            {unlockedBlocks} / {BLOCK_DEFINITIONS.length} unlocked
          </p>
          <button
            onClick={() => void refreshEntitlements()}
              className="mt-3 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200"
          >
            {entitlementsLoading ? 'Refreshing\u2026' : 'Refresh entitlements'}
          </button>
        </div>

        <div className="rounded-xl border border-app bg-app-surface p-4">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-app-soft">
            <Activity className="h-3.5 w-3.5" />
            Local usage
          </p>
          <p className="mt-2 text-sm font-medium text-app-fg">
            {entries.length} runs recorded
          </p>
          <p className="text-xs text-app-soft">Run history from this browser session.</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">
          Block usage breakdown
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BLOCK_DEFINITIONS.map((block) => {
            const count = usageByBlock.get(block.id) ?? 0;
            const unlocked =
              block.featureSlug === 'free' || Boolean(entitlements[block.featureSlug]);
            return (
              <div key={block.id} className="rounded-lg border border-app bg-app-surface p-3">
                <p className="text-sm font-medium text-app-fg">{block.name}</p>
                <p className="mt-1 text-xs text-app-soft">
                  {count} local run{count === 1 ? '' : 's'}
                </p>
                <p
                  className={`mt-1 text-xs ${unlocked ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}
                >
                  {unlocked ? 'Unlocked' : 'Locked'}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

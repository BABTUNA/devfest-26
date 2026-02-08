'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Receipt, ShieldCheck, Activity, ExternalLink } from 'lucide-react';
import { BLOCK_DEFINITIONS } from 'shared';
import { useAppBilling } from '@/contexts/AppBillingContext';
import { DEMO_MODE } from '@/lib/api';
import { useExecutionLog } from '@/store/executionLog';

export default function ProfilePage() {
  const {
    loaded,
    customer,
    subscriptions,
    invoices,
    billingPortalUrl,
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
    if (DEMO_MODE) return BLOCK_DEFINITIONS.length;
    return BLOCK_DEFINITIONS.filter((block) => entitlements[block.featureSlug]).length;
  }, [entitlements]);

  if (!DEMO_MODE && !loaded) {
    return <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 text-sm text-app-soft md:px-6">Loading billing profile…</div>;
  }

  const activeSubs = subscriptions?.filter((sub) => sub.status === 'active' || sub.status === 'trialing') ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Profile</h1>
      <p className="mt-1 text-sm text-app-soft">Track account access, usage snapshots, subscriptions, and invoices.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-app bg-app-surface p-4">
          <p className="text-xs uppercase tracking-wide text-app-soft">User</p>
          <p className="mt-2 text-sm font-medium text-app-fg">{customer?.name ?? 'Demo user'}</p>
          <p className="text-sm text-app-soft">{customer?.email ?? 'demo@example.com'}</p>
        </div>

        <div className="rounded-xl border border-app bg-app-surface p-4">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-app-soft">
            <ShieldCheck className="h-3.5 w-3.5" />
            Entitlements
          </p>
          <p className="mt-2 text-sm font-medium text-app-fg">{unlockedBlocks} / {BLOCK_DEFINITIONS.length} unlocked</p>
          <button
            onClick={() => void refreshEntitlements()}
            className="mt-3 text-xs text-blue-300 hover:text-blue-200"
          >
            {entitlementsLoading ? 'Refreshing…' : 'Refresh entitlements'}
          </button>
        </div>

        <div className="rounded-xl border border-app bg-app-surface p-4">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-app-soft">
            <Activity className="h-3.5 w-3.5" />
            Local usage
          </p>
          <p className="mt-2 text-sm font-medium text-app-fg">{entries.length} runs recorded</p>
          <p className="text-xs text-app-soft">Run history from this browser session.</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">Block usage breakdown</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BLOCK_DEFINITIONS.map((block) => {
            const count = usageByBlock.get(block.id) ?? 0;
            const unlocked = DEMO_MODE || Boolean(entitlements[block.featureSlug]);
            return (
              <div key={block.id} className="rounded-lg border border-app bg-app-surface p-3">
                <p className="text-sm font-medium text-app-fg">{block.name}</p>
                <p className="mt-1 text-xs text-app-soft">{count} local run{count === 1 ? '' : 's'}</p>
                <p className={`mt-1 text-xs ${unlocked ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {unlocked ? 'Unlocked' : 'Locked'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">Subscriptions</h2>
        {!activeSubs.length ? (
          <p className="mt-3 text-sm text-app-soft">No active or trial subscriptions.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {activeSubs.map((sub) => (
              <div key={sub.id} className="rounded-lg border border-app bg-app-surface p-3 text-sm">
                <p className="font-medium text-app-fg">{sub.status}</p>
                <p className="text-app-soft">Subscription ID: {sub.id}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-app-soft">
          <Receipt className="h-4 w-4" />
          Invoices
        </h2>

        {!invoices?.length ? (
          <p className="mt-3 text-sm text-app-soft">No invoices available.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {invoices.slice(0, 20).map((inv) => {
              const amount = inv.total != null ? `$${(inv.total / 100).toFixed(2)}` : '—';
              const date =
                inv.invoiceDate != null
                  ? new Date(inv.invoiceDate * (inv.invoiceDate > 1e12 ? 1 : 1000)).toLocaleDateString()
                  : '—';
              const link = inv.url ?? inv.hostedUrl;

              return (
                <div key={inv.id} className="flex flex-col gap-2 rounded-lg border border-app bg-app-surface p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-app-fg">{inv.status ?? 'pending'}</p>
                    <p className="text-xs text-app-soft">{date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-app-fg">{amount}</span>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200"
                      >
                        View
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {billingPortalUrl && (
          <a
            href={billingPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Open billing portal
          </a>
        )}
        <Link href="/cart" className="text-sm text-blue-300 hover:text-blue-200">
          Go to Cart
        </Link>
      </div>
    </div>
  );
}

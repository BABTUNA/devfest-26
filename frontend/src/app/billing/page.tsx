'use client';

import { Receipt, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { useAppBilling } from '@/contexts/AppBillingContext';

export default function BillingPage() {
  const {
    loaded,
    subscriptions,
    invoices,
    billingPortalUrl,
    refreshEntitlements,
  } = useAppBilling();

  if (!loaded) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 text-sm text-app-soft md:px-6">
        Loading billing data&hellip;
      </div>
    );
  }

  const activeSubs =
    subscriptions?.filter(
      (sub) => sub.status === 'active' || sub.status === 'trialing'
    ) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Billing</h1>
      <p className="mt-1 text-sm text-app-soft">
        Manage subscriptions, view invoices, and access your billing portal.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-app bg-app-surface p-4">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-app-soft">
            <CreditCard className="h-3.5 w-3.5" />
            Subscriptions
          </p>
          <p className="mt-2 text-sm font-medium text-app-fg">
            {activeSubs.length} active
          </p>
        </div>

        <div className="rounded-xl border border-app bg-app-surface p-4">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-app-soft">
            <Receipt className="h-3.5 w-3.5" />
            Invoices
          </p>
          <p className="mt-2 text-sm font-medium text-app-fg">
            {invoices?.length ?? 0} total
          </p>
        </div>

        {billingPortalUrl && (
          <div className="rounded-xl border border-app bg-app-surface p-4">
            <p className="text-xs uppercase tracking-wide text-app-soft">Billing portal</p>
            <a
              href={billingPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200"
            >
              Open portal
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-app-soft">
          <CreditCard className="h-4 w-4" />
          Subscriptions
        </h2>

        {!activeSubs.length ? (
          <p className="mt-3 text-sm text-app-soft">No active or trial subscriptions.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {activeSubs.map((sub) => {
              const periodEnd =
                sub.currentPeriodEnd != null
                  ? new Date(
                      sub.currentPeriodEnd * (sub.currentPeriodEnd > 1e12 ? 1 : 1000)
                    ).toLocaleDateString()
                  : null;

              return (
                <div
                  key={sub.id}
                  className="flex flex-col gap-2 rounded-lg border border-app bg-app-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        sub.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {sub.status}
                    </span>
                    <span className="text-sm text-app-soft">{sub.id}</span>
                  </div>
                  {periodEnd && (
                    <p className="text-xs text-app-soft">Renews {periodEnd}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-app-soft">
          <Receipt className="h-4 w-4" />
          Invoices
        </h2>

        {!invoices?.length ? (
          <p className="mt-3 text-sm text-app-soft">No invoices available.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {invoices.slice(0, 20).map((inv) => {
              const amount =
                inv.total != null ? `$${(inv.total / 100).toFixed(2)}` : '\u2014';
              const date =
                inv.invoiceDate != null
                  ? new Date(
                      inv.invoiceDate * (inv.invoiceDate > 1e12 ? 1 : 1000)
                    ).toLocaleDateString()
                  : '\u2014';
              const link = inv.url ?? inv.hostedUrl;

              return (
                <div
                  key={inv.id}
                  className="flex flex-col gap-2 rounded-lg border border-app bg-app-surface p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-app-fg">
                      {inv.status ?? 'pending'}
                    </p>
                    <p className="text-xs text-app-soft">{date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-app-fg">{amount}</span>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200"
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
        <button
          type="button"
          onClick={() => void refreshEntitlements()}
          className="inline-flex items-center gap-2 rounded-lg border border-app px-4 py-2 text-sm text-app-fg transition hover:bg-app-surface"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}

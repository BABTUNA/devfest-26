'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import {
  ArrowUpRight,
  BadgeDollarSign,
  CircleDollarSign,
  Coins,
  LayoutTemplate,
  TrendingUp,
  Users,
} from 'lucide-react';
import { BLOCK_DEFINITIONS } from 'shared';
import { useExecutionLog } from '@/store/executionLog';
import { useAppBilling } from '@/contexts/AppBillingContext';

type MonetizedWorkflow = {
  id: string;
  name: string;
  category: string;
  blockIds: string[];
  conversionRate: number;
  activeCustomers: number;
  monthlyRevenueCents: number;
  growthPct: number;
};

const WORKFLOW_PORTFOLIO: MonetizedWorkflow[] = [
  {
    id: 'wf-sales-intel',
    name: 'Sales Intelligence Pipeline',
    category: 'B2B lead ops',
    blockIds: ['extract-emails', 'classify-input', 'rewrite-prompt'],
    conversionRate: 14.2,
    activeCustomers: 38,
    monthlyRevenueCents: 104_500,
    growthPct: 18.4,
  },
  {
    id: 'wf-support-triage',
    name: 'Support Triage Copilot',
    category: 'Customer support',
    blockIds: ['summarize-text', 'classify-input'],
    conversionRate: 11.6,
    activeCustomers: 29,
    monthlyRevenueCents: 72_100,
    growthPct: 9.7,
  },
  {
    id: 'wf-content-studio',
    name: 'Content Rewrite Studio',
    category: 'Marketing automation',
    blockIds: ['rewrite-prompt', 'text-join', 'constant'],
    conversionRate: 8.9,
    activeCustomers: 21,
    monthlyRevenueCents: 48_700,
    growthPct: 6.3,
  },
];

const PRICE_ESTIMATE_USD: Record<string, number> = {
  summarize_text_usage: 0.25,
  extract_emails_usage: 0.19,
  rewrite_prompt_usage: 0.31,
  classify_input_usage: 0.22,
  merge_pdfs_subscription: 24,
  dummy5: 0.2,
};

function formatUSD(cents: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    cents / 100
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function AnalyticsPage() {
  const entries = useExecutionLog((state) => state.entries);
  const { subscriptions } = useAppBilling();

  const blockById = useMemo(
    () => new Map(BLOCK_DEFINITIONS.map((block) => [String(block.id), block])),
    []
  );

  const paidSuccesses = useMemo(() => {
    return entries.filter((entry) => {
      if (!entry.success) return false;
      const block = blockById.get(entry.blockId);
      return Boolean(block && block.priceSlug !== 'free');
    });
  }, [entries, blockById]);

  const estimatedRevenueFromRunsCents = useMemo(() => {
    return paidSuccesses.reduce((sum, entry) => {
      const block = blockById.get(entry.blockId);
      if (!block) return sum;
      const usd = PRICE_ESTIMATE_USD[block.priceSlug] ?? 0.2;
      return sum + Math.round(usd * 100);
    }, 0);
  }, [paidSuccesses, blockById]);

  const portfolioRevenueCents = useMemo(
    () => WORKFLOW_PORTFOLIO.reduce((sum, workflow) => sum + workflow.monthlyRevenueCents, 0),
    []
  );

  const revenue30dCents = portfolioRevenueCents + estimatedRevenueFromRunsCents;
  const activeCustomers = WORKFLOW_PORTFOLIO.reduce((sum, workflow) => sum + workflow.activeCustomers, 0);
  const monetizedWorkflowCount = WORKFLOW_PORTFOLIO.length;
  const arpuCents = activeCustomers > 0 ? Math.round(revenue30dCents / activeCustomers) : 0;
  const avgConversionPct =
    WORKFLOW_PORTFOLIO.reduce((sum, workflow) => sum + workflow.conversionRate, 0) / monetizedWorkflowCount;
  const liveSubscriptions = subscriptions?.filter((sub) => sub.status === 'active' || sub.status === 'trialing').length ?? 0;

  const revenueSeries = useMemo(() => {
    const labels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8'];
    const baseline = [18, 22, 25, 21, 29, 34, 31, 38];
    const signalBoost = clamp(Math.round(paidSuccesses.length / 2), 0, 18);
    return labels.map((label, index) => ({
      label,
      value: baseline[index] + Math.round(signalBoost * (index / (labels.length - 1))),
    }));
  }, [paidSuccesses.length]);

  const maxRevenuePoint = Math.max(...revenueSeries.map((item) => item.value), 1);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <div className="rounded-2xl border border-app bg-app-surface/75 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg md:text-3xl">Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm text-app-soft">
              Track revenue, customer growth, and conversion trends for your monetized custom workflows.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-wide text-emerald-300">Current period</p>
            <p className="mt-1 text-sm font-medium text-emerald-200">{formatUSD(revenue30dCents)}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (30d)" value={formatUSD(revenue30dCents)} icon={<CircleDollarSign className="h-4 w-4" />} detail="+12.8% vs prior period" />
        <StatCard label="Active Customers" value={String(activeCustomers)} icon={<Users className="h-4 w-4" />} detail={`${liveSubscriptions} active subscriptions`} />
        <StatCard label="Monetized Workflows" value={String(monetizedWorkflowCount)} icon={<LayoutTemplate className="h-4 w-4" />} detail={`${paidSuccesses.length} paid runs logged`} />
        <StatCard label="ARPU" value={formatUSD(arpuCents)} icon={<Coins className="h-4 w-4" />} detail={`${avgConversionPct.toFixed(1)}% avg conversion`} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-app bg-app-surface p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">Revenue Trend</h2>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              Momentum rising
            </span>
          </div>
          <div className="mt-4 grid grid-cols-8 items-end gap-2">
            {revenueSeries.map((point) => (
              <div key={point.label} className="flex flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end rounded-md bg-app/55 p-1">
                  <div
                    className="w-full rounded-[4px] bg-gradient-to-t from-blue-600 to-cyan-400"
                    style={{ height: `${Math.max((point.value / maxRevenuePoint) * 100, 8)}%` }}
                    aria-hidden
                  />
                </div>
                <span className="text-[10px] text-app-soft">{point.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-app bg-app-surface p-4 md:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">Customer Mix</h2>
          <div className="mt-4 space-y-3">
            <MixRow label="SMB teams" pct={58} />
            <MixRow label="Mid-market" pct={29} />
            <MixRow label="Enterprise pilots" pct={13} />
          </div>
          <div className="mt-5 rounded-lg border border-app bg-app/50 p-3">
            <p className="inline-flex items-center gap-2 text-xs text-app-soft">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              Payout Forecast
            </p>
            <p className="mt-1 text-lg font-semibold text-app-fg">{formatUSD(Math.round(revenue30dCents * 0.86))}</p>
            <p className="text-xs text-app-soft">After platform and payment fees.</p>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-app bg-app-surface p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">Workflow Performance</h2>
          <span className="text-xs text-app-soft">Sorted by monthly revenue</span>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {WORKFLOW_PORTFOLIO.map((workflow) => (
            <article key={workflow.id} className="rounded-lg border border-app bg-app/45 p-3">
              <p className="text-sm font-medium text-app-fg">{workflow.name}</p>
              <p className="mt-0.5 text-xs text-app-soft">{workflow.category}</p>
              <div className="mt-3 space-y-1.5 text-xs">
                <MetricRow label="MRR" value={formatUSD(workflow.monthlyRevenueCents)} />
                <MetricRow label="Active customers" value={String(workflow.activeCustomers)} />
                <MetricRow label="Conversion" value={`${workflow.conversionRate.toFixed(1)}%`} />
                <MetricRow label="Growth" value={`+${workflow.growthPct.toFixed(1)}%`} positive />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {workflow.blockIds.map((blockId) => (
                  <span key={`${workflow.id}-${blockId}`} className="rounded-full border border-app px-2 py-0.5 text-[11px] text-app-soft">
                    {blockById.get(blockId)?.name ?? blockId}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-app bg-app-surface p-4 md:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">Recommended Actions</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <InsightCard
            title="Upsell highest-intent cohort"
            body="Support Triage Copilot has strong trial-to-paid conversion; add usage bundles to increase average order value."
          />
          <InsightCard
            title="Improve activation on Workflow #3"
            body="Content Rewrite Studio has lower conversion. Add one-click templates and shorten first-run setup."
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-app bg-app-surface p-4">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-app-soft">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-app-fg">{value}</p>
      <p className="mt-1 text-xs text-app-soft">{detail}</p>
    </div>
  );
}

function MixRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-app-soft">{label}</span>
        <span className="text-app-fg">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-app/60">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-app-soft">{label}</span>
      <span className={positive ? 'inline-flex items-center gap-1 text-emerald-300' : 'text-app-fg'}>
        {positive && <ArrowUpRight className="h-3.5 w-3.5" />}
        {value}
      </span>
    </div>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-app bg-app/45 p-3">
      <p className="text-sm font-medium text-app-fg">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-app-soft">{body}</p>
    </article>
  );
}

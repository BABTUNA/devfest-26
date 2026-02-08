'use client';

import { useMemo } from 'react';
import {
  Activity,
  Flame,
  Layers,
  Sparkles,
  TrendingDown,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { BLOCK_DEFINITIONS } from 'shared';
import { useExecutionLog, type LogEntry } from '@/store/executionLog';
import { useTokens } from '@/contexts/TokenContext';

/* ── helpers ─────────────────────────────────────────────────────── */

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

/* ── types ───────────────────────────────────────────────────────── */

type BlockUsage = {
  blockId: string;
  name: string;
  usesAI: boolean;
  totalRuns: number;
  successRuns: number;
  tokensConsumed: number;
};

type DailyBucket = {
  label: string;
  tokens: number;
  runs: number;
};

/* ── page ────────────────────────────────────────────────────────── */

export default function UsagePage() {
  const entries = useExecutionLog((s) => s.entries);
  const { balance } = useTokens();

  const blockMap = useMemo(
    () => new Map(BLOCK_DEFINITIONS.map((b) => [String(b.id), b])),
    [],
  );

  /* aggregate per-block usage */
  const blockUsages: BlockUsage[] = useMemo(() => {
    const agg = new Map<string, { runs: number; successes: number; tokens: number }>();
    for (const entry of entries) {
      const def = blockMap.get(entry.blockId);
      const prev = agg.get(entry.blockId) ?? { runs: 0, successes: 0, tokens: 0 };
      prev.runs += 1;
      if (entry.success) {
        prev.successes += 1;
        prev.tokens += def?.tokenCost ?? 0;
      }
      agg.set(entry.blockId, prev);
    }
    return Array.from(agg.entries())
      .map(([id, v]) => {
        const def = blockMap.get(id);
        return {
          blockId: id,
          name: def?.name ?? id,
          usesAI: def?.usesAI ?? false,
          totalRuns: v.runs,
          successRuns: v.successes,
          tokensConsumed: v.tokens,
        };
      })
      .sort((a, b) => b.tokensConsumed - a.tokensConsumed);
  }, [entries, blockMap]);

  /* summary stats */
  const totalTokensUsed = useMemo(
    () => blockUsages.reduce((s, b) => s + b.tokensConsumed, 0),
    [blockUsages],
  );
  const totalRuns = entries.length;
  const successfulRuns = entries.filter((e) => e.success).length;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
  const totalCapacity = totalTokensUsed + balance;
  const usedPct = totalCapacity > 0 ? Math.round((totalTokensUsed / totalCapacity) * 100) : 0;

  /* daily buckets (last 7 days) */
  const dailyBuckets: DailyBucket[] = useMemo(() => {
    const now = Date.now();
    const dayMs = 86_400_000;
    const buckets: DailyBucket[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - i * dayMs;
      const date = new Date(dayStart);
      buckets.push({
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        tokens: 0,
        runs: 0,
      });
    }
    for (const entry of entries) {
      const daysAgo = Math.floor((now - entry.at) / dayMs);
      if (daysAgo >= 0 && daysAgo < 7) {
        const idx = 6 - daysAgo;
        buckets[idx].runs += 1;
        if (entry.success) {
          const def = blockMap.get(entry.blockId);
          buckets[idx].tokens += def?.tokenCost ?? 0;
        }
      }
    }
    return buckets;
  }, [entries, blockMap]);

  const maxDailyTokens = Math.max(...dailyBuckets.map((b) => b.tokens), 1);

  /* top block for gauge highlight */
  const topBlock = blockUsages[0];
  const maxBlockTokens = topBlock?.tokensConsumed ?? 1;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      {/* ── header ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-app bg-app-surface/75 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg md:text-3xl">
              Usage
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-app-soft">
              Monitor your token spend, track which blocks consume the most, and review your
              execution history.
            </p>
          </div>

          {/* circular gauge */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgb(var(--app-border))"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${usedPct} ${100 - usedPct}`}
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-app-fg">
                {usedPct}%
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-app-soft">Used / Total</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-app-fg">
                {formatNum(totalTokensUsed)}{' '}
                <span className="text-app-soft font-normal">/ {formatNum(totalCapacity)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── stat cards ────────────────────────────────────────── */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tokens Spent"
          value={formatNum(totalTokensUsed)}
          icon={<Flame className="h-4 w-4" />}
          detail={`${formatNum(balance)} remaining`}
        />
        <StatCard
          label="Total Runs"
          value={formatNum(totalRuns)}
          icon={<Activity className="h-4 w-4" />}
          detail={`${successfulRuns} successful`}
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={<Zap className="h-4 w-4" />}
          detail={`${totalRuns - successfulRuns} failed`}
        />
        <StatCard
          label="AI Blocks Used"
          value={String(blockUsages.filter((b) => b.usesAI).length)}
          icon={<Sparkles className="h-4 w-4" />}
          detail={`of ${BLOCK_DEFINITIONS.filter((b) => b.usesAI).length} available`}
        />
      </div>

      {/* ── charts row ────────────────────────────────────────── */}
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* per-block breakdown */}
        <section className="rounded-xl border border-app bg-app-surface p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">
              Token Consumption by Block
            </h2>
            <span className="inline-flex items-center gap-1 text-xs text-app-soft">
              <Layers className="h-3.5 w-3.5" />
              {blockUsages.length} blocks
            </span>
          </div>

          {blockUsages.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
              <TrendingDown className="h-8 w-8 text-app-soft/50" />
              <p className="text-sm text-app-soft">No block executions yet.</p>
              <p className="text-xs text-app-soft/70">
                Run some blocks in the Lab to see usage data here.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {blockUsages.map((block) => (
                <div key={block.blockId}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-app-fg">
                      {block.usesAI && (
                        <Sparkles className="h-3 w-3 text-blue-400" />
                      )}
                      {block.name}
                    </span>
                    <span className="tabular-nums text-app-soft">
                      {block.tokensConsumed} tokens &middot; {block.totalRuns} runs
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-app/60">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          (block.tokensConsumed / maxBlockTokens) * 100,
                          4,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* daily usage chart */}
        <section className="rounded-xl border border-app bg-app-surface p-4 md:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">
            Daily Usage (7d)
          </h2>
          <div className="mt-4 grid grid-cols-7 items-end gap-2">
            {dailyBuckets.map((day) => (
              <div key={day.label} className="flex flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end rounded-md bg-app/55 p-1">
                  <div
                    className="w-full rounded-[4px] bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-500"
                    style={{
                      height: `${Math.max(
                        (day.tokens / maxDailyTokens) * 100,
                        day.tokens > 0 ? 8 : 0,
                      )}%`,
                    }}
                    aria-hidden
                  />
                </div>
                <span className="text-[10px] text-app-soft">{day.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-app bg-app/50 p-3">
            <p className="inline-flex items-center gap-2 text-xs text-app-soft">
              <Activity className="h-3.5 w-3.5" />
              7-Day Summary
            </p>
            <p className="mt-1 text-lg font-semibold text-app-fg">
              {formatNum(dailyBuckets.reduce((s, d) => s + d.tokens, 0))}{' '}
              <span className="text-sm font-normal text-app-soft">tokens</span>
            </p>
            <p className="text-xs text-app-soft">
              {formatNum(dailyBuckets.reduce((s, d) => s + d.runs, 0))} total runs this week
            </p>
          </div>
        </section>
      </div>

      {/* ── execution history ─────────────────────────────────── */}
      <section className="mt-5 rounded-xl border border-app bg-app-surface p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-app-soft">
            Recent Executions
          </h2>
          <span className="text-xs text-app-soft">
            {entries.length} logged
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <Clock className="h-8 w-8 text-app-soft/50" />
            <p className="text-sm text-app-soft">No executions recorded yet.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-1.5">
            {entries.slice(0, 20).map((entry) => (
              <ExecutionRow key={entry.id} entry={entry} blockMap={blockMap} />
            ))}
            {entries.length > 20 && (
              <p className="pt-2 text-center text-xs text-app-soft">
                + {entries.length - 20} more executions
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
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

function ExecutionRow({
  entry,
  blockMap,
}: {
  entry: LogEntry;
  blockMap: Map<string, (typeof BLOCK_DEFINITIONS)[number]>;
}) {
  const def = blockMap.get(entry.blockId);
  const cost = entry.success ? (def?.tokenCost ?? 0) : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-app bg-app/45 px-3 py-2.5">
      {entry.success ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-app-fg">{entry.blockName}</p>
        {entry.error && (
          <p className="truncate text-xs text-red-300/80">{entry.error}</p>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-app-soft">
        {cost > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Flame className="h-3 w-3 text-amber-400" />
            {cost}
          </span>
        )}
        <span className="tabular-nums whitespace-nowrap">{relativeTime(entry.at)}</span>
      </div>
    </div>
  );
}

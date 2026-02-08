'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, CheckCircle2, Loader2, Lock, Play, Sparkles, Wrench, ShoppingCart } from 'lucide-react';
import type { BlockDefinition } from 'shared';
import { runBlock } from '@/lib/api';

type BlockCardProps = {
  block: BlockDefinition;
  icon: React.ReactNode;
  hasAccess: boolean;
  compact?: boolean;
  onUnlock: () => Promise<void>;
  onAddToCart?: () => void;
  inCart?: boolean;
};

export function BlockCard({
  block,
  icon,
  hasAccess,
  compact = false,
  onUnlock,
  onAddToCart,
  inCart = false,
}: BlockCardProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const textInputs = useMemo(() => block.inputs.filter((input) => input.type === 'text'), [block.inputs]);
  const hasFileInputs = block.inputs.some((input) => input.type === 'file');
  const requiredMissing = textInputs.some((input) => input.required && !(inputs[input.key] ?? '').trim());
  const canQuickRun = hasAccess && textInputs.length === 0 && !hasFileInputs;
  const billingType = block.priceSlug === 'free'
    ? 'Included'
    : block.priceSlug.includes('subscription')
      ? 'Subscription'
      : block.priceSlug.includes('usage')
        ? 'Usage'
        : 'Purchase';
  const isPurchaseBlock = billingType === 'Purchase';

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);

    const payload: Record<string, string> = {};
    for (const input of textInputs) {
      payload[input.key] = inputs[input.key] ?? '';
    }

    try {
      const data = await runBlock({
        blockId: block.id,
        inputs: payload,
      });
      setOutput(data.outputs ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run block');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    setError(null);
    try {
      await onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-app-card/95 transition hover:border-blue-500/45 hover:shadow-[0_12px_35px_rgba(15,23,42,0.25)] ${
        hasAccess ? 'border-app' : 'border-slate-300 dark:border-slate-600/60'
      }`}
    >
      {!hasAccess && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-200/70 to-slate-300/50 dark:from-slate-900/35 dark:to-slate-950/70 backdrop-blur-[2px]" />
      )}

      <div className={`relative ${compact ? 'p-4' : 'p-5'}`}>
        <div className="mb-3 flex items-start gap-3">
          <div className={`rounded-lg p-2 ${hasAccess ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className={`font-semibold text-app-fg ${compact ? 'text-sm' : ''}`}>{block.name}</h2>
              {hasAccess ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Unlocked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              )}
            </div>
            <p className={`mt-0.5 text-app-soft ${compact ? 'text-xs' : 'text-sm'}`}>{block.description}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {(!isPurchaseBlock || hasAccess) && (
            <span className="rounded-full border border-app px-2 py-1 text-app-soft">{billingType}</span>
          )}
          <span className="rounded-full border border-app px-2 py-1 font-mono text-[11px] text-app-soft">{block.priceSlug}</span>
          {block.usesAI ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 dark:border-blue-500/35 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-blue-700 dark:text-blue-300">
              <Sparkles className="h-3 w-3" />
              AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-500/35 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
              <Wrench className="h-3 w-3" />
              Utility
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasAccess ? (
            <>
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
              >
                Configure
                <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {canQuickRun && (
                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run now
                </button>
              )}
            </>
          ) : (
            <>
              {isPurchaseBlock ? (
                <button
                  type="button"
                  onClick={onAddToCart ?? handleUnlock}
                  disabled={Boolean(onAddToCart && inCart)}
                  className="inline-flex items-center gap-2 rounded-lg border border-app px-4 py-2 text-sm font-medium text-app-fg transition hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {onAddToCart && inCart ? <CheckCircle2 className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  {onAddToCart && inCart ? 'In cart' : 'Purchase'}
                </button>
              ) : (
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Unlock now
                </button>
              )}
            </>
          )}
        </div>

        {expanded && hasAccess && (
          <div className="mt-4 space-y-3 rounded-xl border border-app bg-app-surface/55 p-3">
            {textInputs.length === 0 ? (
              <p className="text-xs text-app-soft">No text input needed for this block.</p>
            ) : (
              textInputs.map((input) => (
                <div key={input.key}>
                  <label className="mb-1 block text-xs font-medium text-app-soft">{input.label}</label>
                  <textarea
                    value={inputs[input.key] ?? ''}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [input.key]: e.target.value }))}
                    placeholder={input.required ? 'Required input' : 'Optional input'}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))
            )}

            {hasFileInputs && (
              <p className="text-xs text-app-soft">
                This block requires file inputs. Uploader support can be added next; checkout and access control are already wired.
              </p>
            )}

            <button
              onClick={handleRun}
              disabled={loading || requiredMissing || hasFileInputs}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run block
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

        {output && (
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-app bg-app-surface p-3 text-xs text-app-fg">
            {JSON.stringify(output, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

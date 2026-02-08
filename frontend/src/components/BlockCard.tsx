'use client';

import { useState } from 'react';
import { Check, CheckCircle2, Loader2, Lock, Plus, Sparkles, Wrench } from 'lucide-react';
import type { BlockDefinition } from 'shared';

type BlockCardProps = {
  block: BlockDefinition;
  hasAccess: boolean;
  compact?: boolean;
  onUnlock: () => Promise<void>;
  onAddToCart?: () => void;
  onRemoveFromCart?: () => void;
  inCart?: boolean;
};

export function BlockCard({
  block,
  hasAccess,
  compact = false,
  onUnlock,
  onAddToCart,
  onRemoveFromCart,
  inCart = false,
}: BlockCardProps) {
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billingType = block.priceSlug === 'free'
    ? 'Included'
    : block.priceSlug.includes('subscription')
      ? 'Subscription'
      : block.priceSlug.includes('usage')
        ? 'Usage'
        : 'Purchase';
  const isPurchaseBlock = billingType === 'Purchase';

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

  const handleToggleCart = () => {
    if (inCart) {
      onRemoveFromCart?.();
    } else {
      onAddToCart?.();
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
        <div className="flex items-stretch gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
            block.usesAI
              ? (hasAccess ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300' : 'bg-blue-100/50 dark:bg-blue-500/10 text-blue-600/70 dark:text-blue-400/70')
              : (hasAccess ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-600/70 dark:text-emerald-400/70')
          }`}>
            {block.usesAI ? <Sparkles className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h2 className={`font-medium leading-tight text-app-fg ${compact ? 'text-[11px]' : 'text-xs'}`}>{block.name}</h2>
            <p className={`leading-tight text-app-soft ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{block.description}</p>
          </div>
          {hasAccess ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleToggleCart}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-amber-100 dark:bg-amber-500/15 text-amber-700 transition hover:bg-amber-200 dark:hover:bg-amber-500/25 dark:text-amber-300"
            >
              {inCart ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
          )}
        </div>

        {!hasAccess && !isPurchaseBlock && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Unlock now
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </div>
    </div>
  );
}

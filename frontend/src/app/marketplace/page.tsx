'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Brain,
  CheckCircle2,
  Filter,
  Mail,
  PenLine,
  TestTube,
  FileStack,
  Play,
  Layers,
  Type,
  GitBranch,
  Search,
  RefreshCw,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useAppBilling } from '@/contexts/AppBillingContext';
import { BlockCard } from '@/components/BlockCard';
import { DEMO_MODE, createCheckoutSession, getProducts } from '@/lib/api';
import type { BlockDefinition } from 'shared';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Mail,
  PenLine,
  TestTube,
  FileStack,
  Play,
  Layers,
  Type,
  GitBranch,
};

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');
  const { hasFeatureAccess, entitlementsLoading, refreshEntitlements, entitlementsError } = useAppBilling();

  const [products, setProducts] = useState<BlockDefinition[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'ai' | 'utility'>('all');
  const [billingFilter, setBillingFilter] = useState<'all' | 'usage' | 'subscription' | 'included'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'name'>('featured');
  const [compactView, setCompactView] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingProducts(true);
    setPageError(null);

    getProducts()
      .then((result) => {
        if (!active) return;
        setProducts(result);
      })
      .catch((error) => {
        if (!active) return;
        setPageError(error instanceof Error ? error.message : 'Failed to fetch products');
      })
      .finally(() => {
        if (!active) return;
        setLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (checkoutStatus === 'success') {
      void refreshEntitlements();
    }
  }, [checkoutStatus, refreshEntitlements]);

  const productsWithMeta = useMemo(() => {
    return products.map((product) => {
      const hasAccess = DEMO_MODE || hasFeatureAccess(product.featureSlug);
      const billingType = product.priceSlug.includes('subscription')
        ? 'subscription'
        : product.priceSlug.includes('usage')
          ? 'usage'
          : 'included';
      return {
        product,
        hasAccess,
        billingType,
      };
    });
  }, [products, hasFeatureAccess]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();

    return productsWithMeta
      .filter(({ product, hasAccess, billingType }) => {
        if (q.trim()) {
          const searchMatch =
            product.name.toLowerCase().includes(q) ||
            product.description.toLowerCase().includes(q) ||
            product.priceSlug.toLowerCase().includes(q);
          if (!searchMatch) return false;
        }

        if (statusFilter === 'unlocked' && !hasAccess) return false;
        if (statusFilter === 'locked' && hasAccess) return false;
        if (kindFilter === 'ai' && !product.usesAI) return false;
        if (kindFilter === 'utility' && product.usesAI) return false;
        if (billingFilter !== 'all' && billingType !== billingFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.product.name.localeCompare(b.product.name);

        if (a.hasAccess !== b.hasAccess) return a.hasAccess ? -1 : 1;
        if (a.product.usesAI !== b.product.usesAI) return a.product.usesAI ? -1 : 1;
        return a.product.name.localeCompare(b.product.name);
      })
      .map(({ product }) => product);
  }, [search, productsWithMeta, statusFilter, kindFilter, billingFilter, sortBy]);

  const stats = useMemo(() => {
    const total = productsWithMeta.length;
    const unlocked = productsWithMeta.filter(({ hasAccess }) => hasAccess).length;
    const aiCount = productsWithMeta.filter(({ product }) => product.usesAI).length;
    const subscriptionCount = productsWithMeta.filter(({ billingType }) => billingType === 'subscription').length;
    return { total, unlocked, aiCount, subscriptionCount };
  }, [productsWithMeta]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count += 1;
    if (kindFilter !== 'all') count += 1;
    if (billingFilter !== 'all') count += 1;
    return count;
  }, [statusFilter, kindFilter, billingFilter]);

  const resetFilters = () => {
    setStatusFilter('all');
    setKindFilter('all');
    setBillingFilter('all');
    setSearch('');
  };

  const handleUnlock = async (priceSlug: string) => {
    const baseUrl = window.location.origin;
    const checkoutSession = await createCheckoutSession({
      priceSlug,
      successUrl: `${baseUrl}/marketplace?checkout=success`,
      cancelUrl: `${baseUrl}/marketplace?checkout=cancelled`,
    });

    if (!checkoutSession?.url) {
      throw new Error('Checkout URL missing from backend response');
    }

    window.location.href = checkoutSession.url;
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <div className="mb-5 rounded-2xl border border-app bg-app-surface/75 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Marketplace</h1>
            <p className="mt-1 text-sm text-app-soft">
              Discover blocks, apply filters quickly, and unlock tools via checkout only when needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshEntitlements()}
            className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh access
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-app bg-app-card/70 px-3 py-2">
            <p className="text-xs text-app-soft">Total blocks</p>
            <p className="mt-1 text-lg font-semibold text-app-fg">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-app bg-app-card/70 px-3 py-2">
            <p className="text-xs text-app-soft">Unlocked</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{stats.unlocked}</p>
          </div>
          <div className="rounded-xl border border-app bg-app-card/70 px-3 py-2">
            <p className="text-xs text-app-soft">AI blocks</p>
            <p className="mt-1 text-lg font-semibold text-blue-300">{stats.aiCount}</p>
          </div>
          <div className="rounded-xl border border-app bg-app-card/70 px-3 py-2">
            <p className="text-xs text-app-soft">Subscriptions</p>
            <p className="mt-1 text-lg font-semibold text-amber-300">{stats.subscriptionCount}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {DEMO_MODE ? (
          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-emerald-300">
            Demo mode: all blocks unlocked
          </span>
        ) : entitlementsLoading ? (
          <span className="rounded-full border border-app px-3 py-1 text-app-soft">Loading entitlements…</span>
        ) : entitlementsError ? (
          <span className="rounded-full border border-rose-500/35 bg-rose-500/10 px-3 py-1 text-rose-300">
            Entitlements unavailable: {entitlementsError}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/35 bg-blue-500/10 px-3 py-1 text-blue-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Entitlements synced
          </span>
        )}
        {checkoutStatus === 'success' && (
          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-emerald-300">
            Checkout complete. Access updated.
          </span>
        )}
        {checkoutStatus === 'cancelled' && (
          <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-amber-300">
            Checkout cancelled.
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-app bg-app-surface/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-app-fg">
              <Filter className="h-4 w-4" />
              Filters
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-app-soft underline-offset-4 hover:text-app-fg hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-app-soft">Access</p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'unlocked', 'locked'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      statusFilter === value
                        ? 'border-blue-500/45 bg-blue-500/15 text-blue-300'
                        : 'border-app text-app-soft hover:text-app-fg'
                    }`}
                  >
                    {value[0].toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-app-soft">Type</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setKindFilter('all')}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    kindFilter === 'all'
                      ? 'border-blue-500/45 bg-blue-500/15 text-blue-300'
                      : 'border-app text-app-soft hover:text-app-fg'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setKindFilter('ai')}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                    kindFilter === 'ai'
                      ? 'border-blue-500/45 bg-blue-500/15 text-blue-300'
                      : 'border-app text-app-soft hover:text-app-fg'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  AI
                </button>
                <button
                  type="button"
                  onClick={() => setKindFilter('utility')}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                    kindFilter === 'utility'
                      ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
                      : 'border-app text-app-soft hover:text-app-fg'
                  }`}
                >
                  <Wrench className="h-3 w-3" />
                  Utility
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-app-soft">Billing</p>
              <div className="space-y-2">
                {(
                  [
                    ['all', 'All billing'],
                    ['usage', 'Usage-based'],
                    ['subscription', 'Subscription'],
                    ['included', 'Included'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBillingFilter(value)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                      billingFilter === value
                        ? 'border-blue-500/45 bg-blue-500/15 text-blue-300'
                        : 'border-app text-app-soft hover:text-app-fg'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-4 rounded-2xl border border-app bg-app-surface/70 p-3 md:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-soft" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search blocks by name, purpose, or plan"
                  className="w-full rounded-xl border border-app bg-app px-3 py-2.5 pl-9 text-sm text-app-fg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'featured' | 'name')}
                  className="rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg focus:border-blue-500 focus:outline-none"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="name">Sort: Name</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCompactView((prev) => !prev)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    compactView
                      ? 'border-blue-500/45 bg-blue-500/15 text-blue-300'
                      : 'border-app text-app-soft hover:text-app-fg'
                  }`}
                >
                  {compactView ? 'Compact view' : 'Comfort view'}
                </button>
              </div>
            </div>
          </div>

          {loadingProducts ? (
            <div className="rounded-xl border border-app bg-app-surface p-6 text-sm text-app-soft">Loading products…</div>
          ) : pageError ? (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-6 text-sm text-rose-300">{pageError}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-app bg-app-surface p-6 text-sm text-app-soft">
              No blocks match your search and filters.
            </div>
          ) : (
            <div className={`grid gap-3 ${compactView ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
              {filteredProducts.map((block) => {
                const hasAccess = DEMO_MODE || hasFeatureAccess(block.featureSlug);
                const Icon = ICON_MAP[block.icon] ?? Brain;

                return (
                  <BlockCard
                    key={block.id}
                    block={block}
                    icon={<Icon className="h-5 w-5" />}
                    hasAccess={hasAccess}
                    compact={compactView}
                    onUnlock={() => handleUnlock(block.priceSlug)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

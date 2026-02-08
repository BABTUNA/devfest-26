'use client';

import { useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  Wrench,
  ShoppingCart,
} from 'lucide-react';
import { useAppBilling } from '@/contexts/AppBillingContext';
import { BlockCard } from '@/components/BlockCard';
import { createCheckoutSession, getProducts } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import type { BlockDefinition } from 'shared';

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');
  const { hasFeatureAccess, refreshEntitlements } = useAppBilling();

  const [products, setProducts] = useState<BlockDefinition[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'ai' | 'utility'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'name'>('featured');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const cartBlockIds = useCartStore((state) => state.blockIds);
  const addBlockToCart = useCartStore((state) => state.addBlock);
  const removeBlockFromCart = useCartStore((state) => state.removeBlock);

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

  useEffect(() => {
    if (!products.length) return;
    for (const product of products) {
      if (hasFeatureAccess(product.featureSlug)) {
        removeBlockFromCart(product.id);
      }
    }
  }, [products, hasFeatureAccess, removeBlockFromCart]);

  const productsWithMeta = useMemo(() => {
    return products.map((product) => {
      const hasAccess = hasFeatureAccess(product.featureSlug);
      const billingType = product.priceSlug === 'free'
        ? 'included'
        : product.priceSlug.includes('subscription')
          ? 'subscription'
          : product.priceSlug.includes('usage')
            ? 'usage'
            : 'purchase';
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
      .filter(({ product, hasAccess }) => {
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
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.product.name.localeCompare(b.product.name);

        if (a.hasAccess !== b.hasAccess) return a.hasAccess ? -1 : 1;
        if (a.product.usesAI !== b.product.usesAI) return a.product.usesAI ? -1 : 1;
        return a.product.name.localeCompare(b.product.name);
      })
      .map(({ product }) => product);
  }, [search, productsWithMeta, statusFilter, kindFilter, sortBy]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count += 1;
    if (kindFilter !== 'all') count += 1;
    return count;
  }, [statusFilter, kindFilter]);

  const resetFilters = () => {
    setStatusFilter('all');
    setKindFilter('all');
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
          <Link
            href="/cart"
            className="relative inline-flex items-center justify-center rounded-lg border border-app p-2.5 text-app-soft transition hover:bg-app-surface hover:text-app-fg"
            aria-label={`Cart${cartBlockIds.length > 0 ? `, ${cartBlockIds.length} items` : ''}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartBlockIds.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-semibold leading-none text-white">
                {cartBlockIds.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-soft/60" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search blocks…"
              className="w-full rounded-lg border border-app bg-transparent px-3 py-2 pl-9 text-sm text-app-fg placeholder:text-app-soft/50 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-0.5 text-xs">
            <div className="flex items-center gap-0.5">
              {(['all', 'unlocked', 'locked'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-md px-2.5 py-1 transition ${
                    statusFilter === value
                      ? 'bg-app-surface text-app-fg font-medium'
                      : 'text-app-soft hover:text-app-fg'
                  }`}
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setKindFilter('all')}
                className={`rounded-md px-2.5 py-1 transition ${
                  kindFilter === 'all'
                    ? 'bg-app-surface text-app-fg font-medium'
                    : 'text-app-soft hover:text-app-fg'
                }`}
              >
                All types
              </button>
              <button
                type="button"
                onClick={() => setKindFilter('ai')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                  kindFilter === 'ai'
                    ? 'bg-app-surface text-app-fg font-medium'
                    : 'text-app-soft hover:text-app-fg'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                AI
              </button>
              <button
                type="button"
                onClick={() => setKindFilter('utility')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                  kindFilter === 'utility'
                    ? 'bg-app-surface text-app-fg font-medium'
                    : 'text-app-soft hover:text-app-fg'
                }`}
              >
                <Wrench className="h-3 w-3" />
                Utility
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'featured' | 'name')}
              className="ml-auto rounded-md bg-transparent py-1 pr-1 text-xs text-app-soft transition focus:text-app-fg focus:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="name">A–Z</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-app-soft transition hover:text-app-fg"
              >
                Reset
              </button>
            )}
          </div>
        </div>

          {loadingProducts ? (
            <div className="rounded-xl border border-app bg-app-surface p-6 text-sm text-app-soft">Loading products…</div>
          ) : pageError ? (
            <div className="rounded-xl border border-rose-300 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-300">{pageError}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-app bg-app-surface p-6 text-sm text-app-soft">
              No blocks match your search and filters.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((block) => {
                const hasAccess = hasFeatureAccess(block.featureSlug);

                return (
                  <BlockCard
                    key={block.id}
                    block={block}
                    hasAccess={hasAccess}
                    compact={false}
                    onUnlock={() => handleUnlock(block.priceSlug)}
                    onAddToCart={hasAccess ? undefined : () => addBlockToCart(block.id)}
                    onRemoveFromCart={hasAccess ? undefined : () => removeBlockFromCart(block.id)}
                    inCart={cartBlockIds.includes(block.id)}
                  />
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-7xl px-4 py-6 text-sm text-app-soft md:px-6 md:py-8">Loading marketplace...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, CheckCircle2, ArrowRight, ShoppingCart, XCircle } from 'lucide-react';
import type { BlockDefinition, BlockId } from 'shared';
import { createCheckoutSession, getProducts } from '@/lib/api';
import { useAppBilling } from '@/contexts/AppBillingContext';
import { useCartStore } from '@/store/cartStore';

const CHECKOUT_QUEUE_STORAGE_KEY = 'flowglad-cart-checkout-queue';
const CHECKOUT_QUEUE_TITLES_STORAGE_KEY = 'flowglad-cart-checkout-titles';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

export default function CheckoutPage() {
  const { hasFeatureAccess, refreshEntitlements, entitlementsLoading } = useAppBilling();
  const cartBlockIds = useCartStore((state) => state.blockIds);
  const removeBlockFromCart = useCartStore((state) => state.removeBlock);
  const clearCart = useCartStore((state) => state.clear);

  const [products, setProducts] = useState<BlockDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoadingSlug, setCheckoutLoadingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<'success' | 'cancelled' | null>(null);
  const [selectedLockedBlockIds, setSelectedLockedBlockIds] = useState<BlockId[]>([]);
  const handledReturnRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getProducts()
      .then((result) => {
        if (!active) return;
        setProducts(result);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load products');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cartProducts = useMemo(() => {
    if (!products.length) return [];
    const byId = new Map(products.map((product) => [product.id, product]));
    return cartBlockIds.map((id) => byId.get(id)).filter((product): product is BlockDefinition => Boolean(product));
  }, [products, cartBlockIds]);

  const unlockedItemsInCart = useMemo(
    () => cartProducts.filter((product) => hasFeatureAccess(product.featureSlug)),
    [cartProducts, hasFeatureAccess]
  );

  const lockedItemsInCart = useMemo(
    () => cartProducts.filter((product) => !hasFeatureAccess(product.featureSlug)),
    [cartProducts, hasFeatureAccess]
  );

  useEffect(() => {
    setSelectedLockedBlockIds((prev) => {
      const lockedIds = new Set(lockedItemsInCart.map((product) => product.id));
      const filtered = prev.filter((id) => lockedIds.has(id));
      if (filtered.length > 0) return filtered;
      return lockedItemsInCart.map((product) => product.id);
    });
  }, [lockedItemsInCart]);

  useEffect(() => {
    if (!cartProducts.length) return;
    for (const product of unlockedItemsInCart) {
      removeBlockFromCart(product.id);
    }
  }, [cartProducts, unlockedItemsInCart, removeBlockFromCart]);

  const startCheckout = useCallback(
    async (
      priceSlug: string,
      priceSlugs: string[] = [],
      outputName?: string,
      queue: string[] = [],
      titleMap: Record<string, string> = {}
    ) => {
    setError(null);
    setCheckoutStatus(null);
    setCheckoutLoadingSlug(priceSlug);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHECKOUT_QUEUE_STORAGE_KEY, JSON.stringify(queue));
      window.localStorage.setItem(CHECKOUT_QUEUE_TITLES_STORAGE_KEY, JSON.stringify(titleMap));
    }

    try {
      const baseUrl = window.location.origin;
      const session = await createCheckoutSession({
        priceSlug,
        priceSlugs,
        outputName,
        outputMetadata: outputName ? { blockTitle: outputName } : undefined,
        successUrl: `${baseUrl}/cart?checkout=success&completed=${encodeURIComponent(priceSlug)}`,
        cancelUrl: `${baseUrl}/cart?checkout=cancelled`,
      });

      if (!session?.url) {
        throw new Error('Checkout URL missing from response');
      }

      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout');
      setCheckoutLoadingSlug(null);
    }
    },
    []
  );

  const handleSingleCheckout = useCallback(
    async (priceSlug: string, priceSlugs: string[] | undefined, outputName?: string) => {
      await startCheckout(priceSlug, priceSlugs ?? [], outputName);
    },
    [startCheckout]
  );

  const selectedLockedItems = useMemo(() => {
    const selected = new Set(selectedLockedBlockIds);
    return lockedItemsInCart.filter((product) => selected.has(product.id));
  }, [lockedItemsInCart, selectedLockedBlockIds]);

  const allLockedSelected = lockedItemsInCart.length > 0 && selectedLockedItems.length === lockedItemsInCart.length;

  const handleCheckoutSelected = useCallback(async () => {
    if (selectedLockedItems.length === 0) {
      setError('Select at least one locked item to start checkout.');
      return;
    }
    const titleMap = Object.fromEntries(selectedLockedItems.map((item) => [item.priceSlug, item.name]));
    const queueEntries = selectedLockedItems.map((item) => ({
      priceSlug: item.priceSlug,
      priceSlugs: item.checkoutPriceSlugs ?? [],
      title: item.name,
    }));
    const [first, ...rest] = queueEntries;
    await startCheckout(
      first.priceSlug,
      first.priceSlugs,
      first.title,
      rest.map((entry) => entry.priceSlug),
      titleMap
    );
  }, [selectedLockedItems, startCheckout]);

  const selectedPricingSummary = useMemo(() => {
    if (selectedLockedItems.length === 0) return null;
    const currencySet = new Set(selectedLockedItems.map((item) => item.priceCurrency).filter(Boolean));
    const hasAllAmounts = selectedLockedItems.every((item) => typeof item.priceUnitAmount === 'number');
    if (!hasAllAmounts || currencySet.size !== 1) {
      return {
        canTotal: false as const,
      };
    }

    const currency = [...currencySet][0] as string;
    const total = selectedLockedItems.reduce((sum, item) => sum + (item.priceUnitAmount ?? 0), 0);
    return {
      canTotal: true as const,
      currency,
      total,
    };
  }, [selectedLockedItems]);

  useEffect(() => {
    if (handledReturnRef.current) return;
    handledReturnRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const status = params.get('checkout');
    const completed = params.get('completed');
    if (status !== 'success' && status !== 'cancelled') return;

    setCheckoutStatus(status);

    if (status === 'cancelled') {
      setCheckoutLoadingSlug(null);
      return;
    }

    void refreshEntitlements().finally(() => {
      setCheckoutLoadingSlug(null);
      const stored = window.localStorage.getItem(CHECKOUT_QUEUE_STORAGE_KEY);
      const storedTitles = window.localStorage.getItem(CHECKOUT_QUEUE_TITLES_STORAGE_KEY);
      const queue = (() => {
        try {
          const parsed = JSON.parse(stored ?? '[]') as unknown;
          if (!Array.isArray(parsed)) return [];
          return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
        } catch {
          return [];
        }
      })();
      const titleMap = (() => {
        try {
          const parsed = JSON.parse(storedTitles ?? '{}') as unknown;
          if (!parsed || typeof parsed !== 'object') return {} as Record<string, string>;
          return Object.fromEntries(
            Object.entries(parsed).filter(
              (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'
            )
          );
        } catch {
          return {} as Record<string, string>;
        }
      })();

      const remaining = completed ? queue.filter((slug) => slug !== completed) : queue;
      if (remaining.length === 0) {
        window.localStorage.removeItem(CHECKOUT_QUEUE_STORAGE_KEY);
        window.localStorage.removeItem(CHECKOUT_QUEUE_TITLES_STORAGE_KEY);
        return;
      }

      const [next, ...rest] = remaining;
      void startCheckout(next, [], titleMap[next], rest, titleMap);
    });
  }, [refreshEntitlements, startCheckout]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Cart</h1>
      <p className="mt-1 text-sm text-app-soft">
        Select locked block items, then start Flowglad checkout for the selected group.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {entitlementsLoading && (
          <span className="rounded-full border border-app px-3 py-1 text-app-soft">Checking entitlements…</span>
        )}
        {checkoutStatus === 'success' && (
          <span className="rounded-full border border-emerald-300 dark:border-emerald-500/35 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
            Checkout complete. Entitlements refreshed.
          </span>
        )}
        {checkoutStatus === 'cancelled' && (
          <span className="rounded-full border border-amber-300 dark:border-amber-500/35 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">
            Checkout cancelled.
          </span>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

      {!loading && lockedItemsInCart.length > 0 && (
        <div className="mt-6 rounded-xl border border-app bg-app-surface/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-app-soft">
              {selectedLockedItems.length} of {lockedItemsInCart.length} locked items selected
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedLockedBlockIds(lockedItemsInCart.map((item) => item.id))}
                className="rounded-md border border-app px-3 py-1.5 text-xs text-app-soft transition hover:bg-app-surface hover:text-app-fg"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedLockedBlockIds([])}
                className="rounded-md border border-app px-3 py-1.5 text-xs text-app-soft transition hover:bg-app-surface hover:text-app-fg"
              >
                Clear
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCheckoutSelected()}
            disabled={selectedLockedItems.length === 0 || checkoutLoadingSlug !== null}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutLoadingSlug ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {checkoutLoadingSlug ? 'Starting checkout…' : `Checkout selected (${selectedLockedItems.length})`}
          </button>
          <div className="mt-3 rounded-lg border border-app bg-app/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-app-soft">Selected checkout summary</p>
            <div className="mt-2 space-y-1">
              {selectedLockedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-app-fg">{item.name}</span>
                  <span className="text-app-soft">
                    {typeof item.priceUnitAmount === 'number' && item.priceCurrency
                      ? formatCurrency(item.priceUnitAmount, item.priceCurrency)
                      : item.priceName ?? item.priceSlug}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-app pt-2 text-sm">
              {selectedPricingSummary?.canTotal ? (
                <div className="flex items-center justify-between font-medium text-app-fg">
                  <span>Total</span>
                  <span>{formatCurrency(selectedPricingSummary.total, selectedPricingSummary.currency)}</span>
                </div>
              ) : (
                <p className="text-xs text-app-soft">
                  Total unavailable until Flowglad pricing values are configured for all selected items.
                </p>
              )}
            </div>
          </div>
          {!allLockedSelected && selectedLockedItems.length > 0 && (
            <p className="mt-2 text-xs text-app-soft">
              Only selected items will enter checkout. Remaining locked items stay in cart.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {loading ? (
          <div className="rounded-xl border border-app bg-app-surface p-4 text-sm text-app-soft">Loading products…</div>
        ) : cartProducts.length === 0 ? (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-5">
            <p className="inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <ShoppingCart className="h-4 w-4" />
              Your cart is empty.
            </p>
            <Link href="/marketplace" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-200 hover:text-emerald-600 dark:hover:text-emerald-100">
              Browse Marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          lockedItemsInCart.map((block) => (
            <div
              key={block.id}
              className="flex flex-col gap-3 rounded-xl border border-app bg-app-surface p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3">
                <input
                  id={`select-${block.id}`}
                  type="checkbox"
                  checked={selectedLockedBlockIds.includes(block.id)}
                  onChange={(event) => {
                    setSelectedLockedBlockIds((prev) => {
                      if (event.target.checked) return prev.includes(block.id) ? prev : [...prev, block.id];
                      return prev.filter((id) => id !== block.id);
                    });
                  }}
                  className="mt-1 h-4 w-4 rounded border-app bg-app text-blue-500 focus:ring-2 focus:ring-blue-500/40"
                />
                <div>
                  <label htmlFor={`select-${block.id}`} className="cursor-pointer text-sm font-medium text-app-fg">
                    {block.name}
                  </label>
                  <p className="text-sm text-app-soft">{block.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-app px-2 py-1 text-app-soft">{block.priceSlug}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-500/35 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSingleCheckout(block.priceSlug, block.checkoutPriceSlugs, block.name)}
                disabled={checkoutLoadingSlug === block.priceSlug}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkoutLoadingSlug === block.priceSlug ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Checkout
              </button>
            </div>
          ))
        )}
      </div>

      {!loading && unlockedItemsInCart.length > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Already unlocked and removed from checkout queue:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unlockedItemsInCart.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-500/35 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {!loading && cartProducts.length > 0 && lockedItemsInCart.length === 0 && (
        <div className="mt-4 rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-5">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Everything in your cart is unlocked.</p>
          <Link href="/marketplace" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-200 hover:text-emerald-600 dark:hover:text-emerald-100">
            Return to Marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void refreshEntitlements()}
          className="rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
        >
          Refresh entitlements
        </button>
        <button
          type="button"
          onClick={clearCart}
          className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-soft transition hover:bg-app-surface hover:text-app-fg"
        >
          <XCircle className="h-4 w-4" />
          Clear cart
        </button>
        <Link href="/profile" className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200">
          View subscriptions and invoices
        </Link>
      </div>
    </div>
  );
}

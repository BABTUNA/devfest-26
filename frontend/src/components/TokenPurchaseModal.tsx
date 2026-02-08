'use client';

import { useState } from 'react';
import { X, Coins, Zap, Calendar, Loader2 } from 'lucide-react';
import { useTokens } from '@/contexts/TokenContext';
import { API_URL, DEMO_USER_ID } from '@/lib/api';

// Define token packs locally to avoid import issues
interface TokenPack {
    id: string;
    name: string;
    tokens: number;
    priceUsd: number;
    priceSlug: string;
}

interface TokenSubscription {
    id: string;
    name: string;
    tokensPerPeriod: number;
    priceUsd: number;
    priceSlug: string;
    interval: 'week' | 'month';
}

const TOKEN_PACKS: TokenPack[] = [
    {
        id: 'starter',
        name: 'Starter Pack',
        tokens: 100,
        priceUsd: 5,
        priceSlug: 'starter_pack',
    },
    {
        id: 'pro',
        name: 'Pro Pack',
        tokens: 500,
        priceUsd: 20,
        priceSlug: 'pro_pack',
    },
];

const TOKEN_SUBSCRIPTIONS: TokenSubscription[] = [
    {
        id: 'monthly',
        name: 'Monthly Plan',
        tokensPerPeriod: 200,
        priceUsd: 10,
        priceSlug: 'monthly_plan',
        interval: 'month',
    },
    {
        id: 'weekly',
        name: 'Weekly Plan',
        tokensPerPeriod: 50,
        priceUsd: 3,
        priceSlug: 'weekly_plan',
        interval: 'week',
    },
];

interface TokenPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TokenPurchaseModal({ isOpen, onClose }: TokenPurchaseModalProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { refresh } = useTokens();

    if (!isOpen) return null;

    const handlePurchase = async (priceSlug: string) => {
        setLoading(priceSlug);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/tokens/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': DEMO_USER_ID,
                },
                body: JSON.stringify({
                    priceSlug,
                    successUrl: window.location.href,
                    cancelUrl: window.location.href,
                }),
            });

            const data = await res.json();

            if (data.demoMode) {
                await refresh();
                onClose();
                return;
            }

            if (data.error) {
                setError(data.error);
                return;
            }

            const checkoutUrl = data.url ?? data.checkoutSession?.checkoutUrl;
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                setError('No checkout URL returned');
            }
        } catch {
            setError('Failed to create checkout');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-app bg-app-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-app p-5">
                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-amber-100 dark:bg-amber-500/20 p-2">
                            <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-app-fg">Buy Tokens</h2>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 transition hover:bg-app-card">
                        <X className="h-5 w-5 text-app-soft" />
                    </button>
                </div>

                <div className="space-y-6 p-5">
                    {error && (
                        <div className="rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
                            {error}
                        </div>
                    )}

                    <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-app-soft">
                            <Zap className="h-4 w-4" />
                            Token Packs (One-time)
                        </h3>
                        <div className="grid gap-3">
                            {TOKEN_PACKS.map((pack) => (
                                <button
                                    key={pack.id}
                                    onClick={() => handlePurchase(pack.priceSlug)}
                                    disabled={loading !== null}
                                    className="flex items-center justify-between rounded-xl border border-app bg-app-card p-4 transition-all hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-app-card/80 disabled:opacity-50"
                                >
                                    <div className="text-left">
                                        <div className="font-medium text-app-fg">{pack.name}</div>
                                        <div className="text-sm text-amber-600 dark:text-amber-400">{pack.tokens.toLocaleString()} tokens</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-app-fg">${pack.priceUsd}</span>
                                        {loading === pack.priceSlug && (
                                            <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-app-soft">
                            <Calendar className="h-4 w-4" />
                            Subscriptions (Recurring)
                        </h3>
                        <div className="grid gap-3">
                            {TOKEN_SUBSCRIPTIONS.map((sub) => (
                                <button
                                    key={sub.id}
                                    onClick={() => handlePurchase(sub.priceSlug)}
                                    disabled={loading !== null}
                                    className="flex items-center justify-between rounded-xl border border-emerald-300 dark:border-emerald-700/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 p-4 transition-all hover:border-emerald-400 dark:hover:border-emerald-500/70 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50 disabled:opacity-50"
                                >
                                    <div className="text-left">
                                        <div className="font-medium text-app-fg">{sub.name}</div>
                                        <div className="text-sm text-emerald-600 dark:text-emerald-400">
                                            {sub.tokensPerPeriod.toLocaleString()} tokens/{sub.interval}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-app-fg">
                                            ${sub.priceUsd}/{sub.interval === 'month' ? 'mo' : 'wk'}
                                        </span>
                                        {loading === sub.priceSlug && (
                                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t border-app p-5 text-center text-xs text-app-soft">
                    Tokens are used when running AI blocks. Free utility blocks don&apos;t consume tokens.
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { X, Coins, Zap, Calendar, Loader2 } from 'lucide-react';
import { useTokens } from '@/contexts/TokenContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

    const handlePurchase = async (priceSlug: string, productName: string) => {
        setLoading(priceSlug);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/tokens/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': 'demo-user-2',
                },
                body: JSON.stringify({
                    priceSlug,
                    successUrl: window.location.href,
                    cancelUrl: window.location.href,
                }),
            });

            const data = await res.json();

            if (data.demoMode) {
                // Demo mode - tokens credited directly
                await refresh();
                onClose();
                alert(`🎉 ${data.tokensAdded} tokens added! New balance: ${data.newBalance}`);
                return;
            }

            if (data.error) {
                setError(data.error);
                return;
            }

            // Redirect to Flowglad checkout
            const checkoutUrl = data.url ?? data.checkoutSession?.checkoutUrl;
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                setError('No checkout URL returned');
            }
        } catch (e) {
            setError('Failed to create checkout');
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <Coins className="h-5 w-5 text-amber-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Buy Tokens</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 transition">
                        <X className="h-5 w-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-6">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* One-time packs */}
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
                            <Zap className="h-4 w-4" />
                            Token Packs (One-time)
                        </h3>
                        <div className="grid gap-3">
                            {TOKEN_PACKS.map((pack) => (
                                <button
                                    key={pack.id}
                                    onClick={() => handlePurchase(pack.priceSlug, pack.name)}
                                    disabled={loading !== null}
                                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 hover:border-amber-500/50 transition-all disabled:opacity-50"
                                >
                                    <div className="text-left">
                                        <div className="font-medium text-white">{pack.name}</div>
                                        <div className="text-sm text-amber-400">{pack.tokens.toLocaleString()} tokens</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-white">${pack.priceUsd}</span>
                                        {loading === pack.priceSlug && (
                                            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subscriptions */}
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
                            <Calendar className="h-4 w-4" />
                            Subscriptions (Recurring)
                        </h3>
                        <div className="grid gap-3">
                            {TOKEN_SUBSCRIPTIONS.map((sub) => (
                                <button
                                    key={sub.id}
                                    onClick={() => handlePurchase(sub.priceSlug, sub.name)}
                                    disabled={loading !== null}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-900/30 to-teal-900/30 hover:from-emerald-900/50 hover:to-teal-900/50 border border-emerald-700/50 hover:border-emerald-500/70 transition-all disabled:opacity-50"
                                >
                                    <div className="text-left">
                                        <div className="font-medium text-white">{sub.name}</div>
                                        <div className="text-sm text-emerald-400">
                                            {sub.tokensPerPeriod.toLocaleString()} tokens/{sub.interval}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-white">
                                            ${sub.priceUsd}/{sub.interval === 'month' ? 'mo' : 'wk'}
                                        </span>
                                        {loading === sub.priceSlug && (
                                            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-zinc-700 text-center text-xs text-zinc-500">
                    Tokens are used when running AI agents. Free blocks don&apos;t consume tokens.
                </div>
            </div>
        </div>
    );
}

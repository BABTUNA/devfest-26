'use client';

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { API_URL, DEMO_USER_ID } from '@/lib/api';

interface TokenContextValue {
    balance: number;
    loading: boolean;
    refresh: () => Promise<void>;
    deductLocally: (amount: number) => void;
    verifyPurchases: () => Promise<{ tokensAdded: number }>;
}

const TokenContext = createContext<TokenContextValue>({
    balance: 0,
    loading: true,
    refresh: async () => { },
    deductLocally: () => { },
    verifyPurchases: async () => ({ tokensAdded: 0 }),
});

export function TokenProvider({ children }: { children: ReactNode }) {
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            const res = await fetch(`${API_URL}/api/tokens`, {
                headers: { 'X-User-Id': DEMO_USER_ID },
            });
            if (res.ok) {
                const data = await res.json();
                setBalance(data.balance);
            }
        } catch (e) {
            console.error('[Tokens] Failed to fetch balance:', e);
        } finally {
            setLoading(false);
        }
    };

    const deductLocally = (amount: number) => {
        setBalance((prev) => Math.max(0, prev - amount));
    };

    // Verify and credit any pending Flowglad purchases
    const verifyPurchases = async (): Promise<{ tokensAdded: number }> => {
        try {
            const res = await fetch(`${API_URL}/api/tokens/verify-purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': DEMO_USER_ID,
                },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.tokensAdded > 0) {
                    setBalance(data.newBalance);
                    console.log(`[Tokens] Verified ${data.purchasesProcessed} purchases, added ${data.tokensAdded} tokens`);
                }
                return { tokensAdded: data.tokensAdded ?? 0 };
            }
        } catch (e) {
            console.error('[Tokens] Failed to verify purchases:', e);
        }
        return { tokensAdded: 0 };
    };

    useEffect(() => {
        // On mount, verify purchases first (in case returning from checkout), then refresh balance
        const init = async () => {
            await verifyPurchases();
            await refresh();
        };
        init();
    }, []);

    return (
        <TokenContext.Provider value={{ balance, loading, refresh, deductLocally, verifyPurchases }}>
            {children}
        </TokenContext.Provider>
    );
}

export function useTokens() {
    return useContext(TokenContext);
}

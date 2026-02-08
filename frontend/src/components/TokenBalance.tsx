'use client';

import { Coins } from 'lucide-react';
import { useTokens } from '@/contexts/TokenContext';

export function TokenBalance({ onClick }: { onClick?: () => void }) {
    const { balance, loading } = useTokens();

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 rounded-full border border-amber-400 dark:border-amber-500/30 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 px-3 py-1.5 transition-all hover:border-amber-500 dark:hover:border-amber-400/50"
            title="Click to buy more tokens"
        >
            <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-200">
                {loading ? '...' : balance.toLocaleString()}
            </span>
        </button>
    );
}

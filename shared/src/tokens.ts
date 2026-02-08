// Token pack and subscription definitions

export interface TokenPack {
    id: string;
    name: string;
    tokens: number;
    priceUsd: number;
    priceSlug: string;
    type: 'one_time';
}

export interface TokenSubscription {
    id: string;
    name: string;
    tokensPerPeriod: number;
    priceUsd: number;
    priceSlug: string;
    interval: 'week' | 'month';
    type: 'subscription';
}

export const TOKEN_PACKS: TokenPack[] = [
    {
        id: 'starter',
        name: 'Starter Pack',
        tokens: 100,
        priceUsd: 5,
        priceSlug: 'starter_pack',
        type: 'one_time',
    },
    {
        id: 'pro',
        name: 'Pro Pack',
        tokens: 500,
        priceUsd: 20,
        priceSlug: 'pro_pack',
        type: 'one_time',
    },
];

export const TOKEN_SUBSCRIPTIONS: TokenSubscription[] = [
    {
        id: 'monthly',
        name: 'Monthly Plan',
        tokensPerPeriod: 200,
        priceUsd: 10,
        priceSlug: 'monthly_sub',
        interval: 'month',
        type: 'subscription',
    },
    {
        id: 'weekly',
        name: 'Weekly Plan',
        tokensPerPeriod: 50,
        priceUsd: 3,
        priceSlug: 'weekly_sub',
        interval: 'week',
        type: 'subscription',
    },
];

export type TokenProduct = TokenPack | TokenSubscription;

export function getTokenPackById(id: string): TokenPack | undefined {
    return TOKEN_PACKS.find((p) => p.id === id);
}

export function getTokenSubscriptionById(id: string): TokenSubscription | undefined {
    return TOKEN_SUBSCRIPTIONS.find((s) => s.id === id);
}

export function getTokenProductByPriceSlug(priceSlug: string): TokenProduct | undefined {
    return (
        TOKEN_PACKS.find((p) => p.priceSlug === priceSlug) ||
        TOKEN_SUBSCRIPTIONS.find((s) => s.priceSlug === priceSlug)
    );
}

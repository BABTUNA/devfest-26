// In-memory token balance store (demo purposes - use database in production)

interface UserTokenData {
    balance: number;
    lastRefresh: Date;
    subscriptionId?: string;
    subscriptionInterval?: 'week' | 'month';
    creditedPurchases?: string[]; // Track Flowglad purchase IDs that have been credited
}

const tokenStore = new Map<string, UserTokenData>();

// Default starting balance for new users
const DEFAULT_BALANCE = 10;

export function getTokenBalance(userId: string): number {
    const data = tokenStore.get(userId);
    if (!data) {
        // Initialize new user with starting balance
        tokenStore.set(userId, {
            balance: DEFAULT_BALANCE,
            lastRefresh: new Date(),
        });
        return DEFAULT_BALANCE;
    }
    return data.balance;
}

export function getUserTokenData(userId: string): UserTokenData {
    const data = tokenStore.get(userId);
    if (!data) {
        const newData: UserTokenData = {
            balance: DEFAULT_BALANCE,
            lastRefresh: new Date(),
        };
        tokenStore.set(userId, newData);
        return newData;
    }
    return data;
}

export function deductTokens(userId: string, amount: number): { success: boolean; newBalance: number; error?: string } {
    const data = getUserTokenData(userId);

    if (data.balance < amount) {
        return {
            success: false,
            newBalance: data.balance,
            error: `Insufficient tokens. Need ${amount}, have ${data.balance}.`,
        };
    }

    data.balance -= amount;
    tokenStore.set(userId, data);

    return {
        success: true,
        newBalance: data.balance,
    };
}

export function creditTokens(userId: string, amount: number, reason?: string): { newBalance: number } {
    const data = getUserTokenData(userId);
    data.balance += amount;
    tokenStore.set(userId, data);

    console.log(`[Tokens] Credited ${amount} tokens to ${userId}. Reason: ${reason ?? 'manual'}. New balance: ${data.balance}`);

    return { newBalance: data.balance };
}

export function setSubscription(
    userId: string,
    subscriptionId: string,
    interval: 'week' | 'month',
    tokensToCredit: number
): void {
    const data = getUserTokenData(userId);
    data.subscriptionId = subscriptionId;
    data.subscriptionInterval = interval;
    data.lastRefresh = new Date();
    data.balance += tokensToCredit;
    tokenStore.set(userId, data);

    console.log(`[Tokens] Subscription set for ${userId}: ${interval}ly, credited ${tokensToCredit} tokens`);
}

export function cancelSubscription(userId: string): void {
    const data = getUserTokenData(userId);
    data.subscriptionId = undefined;
    data.subscriptionInterval = undefined;
    tokenStore.set(userId, data);

    console.log(`[Tokens] Subscription cancelled for ${userId}`);
}

export function refreshSubscriptionTokens(userId: string, tokensToCredit: number): void {
    const data = getUserTokenData(userId);
    data.balance += tokensToCredit;
    data.lastRefresh = new Date();
    tokenStore.set(userId, data);

    console.log(`[Tokens] Subscription refresh for ${userId}: credited ${tokensToCredit} tokens. New balance: ${data.balance}`);
}

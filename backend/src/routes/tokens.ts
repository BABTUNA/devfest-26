import { Router } from 'express';
import { getCustomerExternalId } from '../lib/auth.js';
import { getTokenBalance, getUserTokenData, creditTokens } from '../store/tokenStore.js';
import { flowglad } from '../lib/flowglad.js';

export const tokensRouter = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const FLOWGLAD_API_URL = 'https://app.flowglad.com/api/v1';
const FLOWGLAD_SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;

// Token pack definitions (local to avoid shared import issues)
interface TokenPack {
    id: string;
    name: string;
    tokens: number;
    priceUsd: number;
    priceSlug: string;
    type: 'one_time';
}

interface TokenSubscription {
    id: string;
    name: string;
    tokensPerPeriod: number;
    priceUsd: number;
    priceSlug: string;
    interval: 'week' | 'month';
    type: 'subscription';
}

const TOKEN_PACKS: TokenPack[] = [
    { id: 'starter', name: 'Starter Pack', tokens: 100, priceUsd: 5, priceSlug: 'starter_pack', type: 'one_time' },
    { id: 'pro', name: 'Pro Pack', tokens: 500, priceUsd: 20, priceSlug: 'pro_pack', type: 'one_time' },
];

const TOKEN_SUBSCRIPTIONS: TokenSubscription[] = [
    { id: 'monthly', name: 'Monthly Plan', tokensPerPeriod: 200, priceUsd: 10, priceSlug: 'monthly_plan', interval: 'month', type: 'subscription' },
    { id: 'weekly', name: 'Weekly Plan', tokensPerPeriod: 50, priceUsd: 3, priceSlug: 'weekly_plan', interval: 'week', type: 'subscription' },
];

function getTokenProductByPriceSlug(priceSlug: string) {
    return TOKEN_PACKS.find((p) => p.priceSlug === priceSlug) ||
        TOKEN_SUBSCRIPTIONS.find((s) => s.priceSlug === priceSlug);
}

// GET /api/tokens - Get user's token balance
tokensRouter.get('/', async (req, res) => {
    try {
        const userId = await getCustomerExternalId(req);
        const data = getUserTokenData(userId);

        res.json({
            balance: data.balance,
            subscription: data.subscriptionId ? {
                interval: data.subscriptionInterval,
                lastRefresh: data.lastRefresh,
            } : null,
        });
    } catch (e) {
        console.error('tokens error', e);
        res.status(500).json({ error: 'Failed to get token balance' });
    }
});

// GET /api/tokens/products - Get available token packs and subscriptions
tokensRouter.get('/products', async (_req, res) => {
    res.json({
        packs: TOKEN_PACKS,
        subscriptions: TOKEN_SUBSCRIPTIONS,
    });
});

// POST /api/tokens/purchase - Create checkout for token pack or subscription
tokensRouter.post('/purchase', async (req, res) => {
    try {
        const userId = await getCustomerExternalId(req);
        const { priceSlug, successUrl, cancelUrl } = req.body as {
            priceSlug: string;
            successUrl: string;
            cancelUrl: string;
        };

        if (!priceSlug || !successUrl || !cancelUrl) {
            return res.status(400).json({ error: 'priceSlug, successUrl, cancelUrl required' });
        }

        // Verify this is a valid token product
        const product = getTokenProductByPriceSlug(priceSlug);
        if (!product) {
            return res.status(400).json({ error: 'Invalid token product' });
        }

        if (DEMO_MODE) {
            // In demo mode, credit tokens directly without checkout
            const tokens = product.type === 'one_time' ? product.tokens : product.tokensPerPeriod;
            creditTokens(userId, tokens, `demo purchase: ${priceSlug}`);
            return res.json({
                demoMode: true,
                tokensAdded: tokens,
                newBalance: getUserTokenData(userId).balance,
            });
        }

        // Create Flowglad checkout
        const fgClient = flowglad(userId);
        await fgClient.findOrCreateCustomer();
        const result = await fgClient.createCheckoutSession({
            priceSlug,
            successUrl,
            cancelUrl,
        });

        res.json(result);
    } catch (e) {
        console.error('token purchase error', e);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// POST /api/tokens/verify-purchase - Check Flowglad for recent purchases and credit tokens
tokensRouter.post('/verify-purchase', async (req, res) => {
    try {
        const userId = await getCustomerExternalId(req);

        if (!FLOWGLAD_SECRET_KEY) {
            return res.status(500).json({ error: 'Flowglad not configured' });
        }

        // Fetch user's billing data from Flowglad
        const billingRes = await fetch(`${FLOWGLAD_API_URL}/customers/${userId}/billing`, {
            method: 'GET',
            headers: {
                'Authorization': FLOWGLAD_SECRET_KEY,
                'Content-Type': 'application/json',
            },
        });

        if (!billingRes.ok) {
            console.warn(`[Tokens] Failed to fetch billing for user ${userId}: ${billingRes.status}`);
            return res.status(500).json({ error: 'Failed to fetch purchases' });
        }

        const billingData = await billingRes.json() as {
            purchases?: Array<{ id: string; priceId: string; createdAt: number }>;
            catalog?: {
                products?: Array<{
                    id: string;
                    slug: string;
                    defaultPrice?: { id: string; slug: string };
                    prices?: Array<{ id: string; slug: string }>;
                }>;
            };
        };

        // Build priceId -> productSlug map
        const priceIdToSlug = new Map<string, string>();
        if (billingData.catalog?.products) {
            for (const product of billingData.catalog.products) {
                if (product.defaultPrice) {
                    priceIdToSlug.set(product.defaultPrice.id, product.slug);
                }
                if (product.prices) {
                    for (const price of product.prices) {
                        priceIdToSlug.set(price.id, product.slug);
                    }
                }
            }
        }

        // Get user's existing credited purchases (stored in tokenStore)
        const userData = getUserTokenData(userId);
        const creditedPurchases = new Set(userData.creditedPurchases ?? []);

        let tokensAdded = 0;
        const newCredits: string[] = [];

        // Check each purchase and credit tokens if not already credited
        if (billingData.purchases) {
            for (const purchase of billingData.purchases) {
                // Skip if already credited
                if (creditedPurchases.has(purchase.id)) {
                    continue;
                }

                const productSlug = priceIdToSlug.get(purchase.priceId);
                if (!productSlug) continue;

                // Check if this is a token product
                const tokenProduct = getTokenProductByPriceSlug(productSlug);
                if (tokenProduct) {
                    const tokens = tokenProduct.type === 'one_time' ? tokenProduct.tokens : tokenProduct.tokensPerPeriod;
                    creditTokens(userId, tokens, `flowglad purchase: ${purchase.id}`);
                    tokensAdded += tokens;
                    newCredits.push(purchase.id);
                    console.log(`[Tokens] Credited ${tokens} tokens to ${userId} for purchase ${purchase.id}`);
                }
            }
        }

        // Update credited purchases list
        if (newCredits.length > 0) {
            userData.creditedPurchases = [...(userData.creditedPurchases ?? []), ...newCredits];
        }

        const newBalance = getUserTokenData(userId).balance;
        res.json({
            success: true,
            tokensAdded,
            newBalance,
            purchasesProcessed: newCredits.length,
        });
    } catch (e) {
        console.error('token verify-purchase error', e);
        res.status(500).json({ error: 'Failed to verify purchases' });
    }
});

// POST /api/tokens/credit - Manually credit tokens (for testing/admin)
tokensRouter.post('/credit', async (req, res) => {
    try {
        const userId = await getCustomerExternalId(req);
        const { amount, reason } = req.body as { amount: number; reason?: string };

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'amount must be a positive number' });
        }

        const result = creditTokens(userId, amount, reason ?? 'manual');
        res.json({ success: true, newBalance: result.newBalance });
    } catch (e) {
        console.error('token credit error', e);
        res.status(500).json({ error: 'Failed to credit tokens' });
    }
});

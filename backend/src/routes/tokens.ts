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
        console.log(`[Tokens] Verifying purchases for user: ${userId}`);

        if (!FLOWGLAD_SECRET_KEY) {
            console.log('[Tokens] DEMO_MODE or no Flowglad key, skipping verification');
            return res.json({ success: true, tokensAdded: 0, newBalance: getUserTokenData(userId).balance, purchasesProcessed: 0 });
        }

        // Fetch user's billing data from Flowglad
        const billingUrl = `${FLOWGLAD_API_URL}/customers/${userId}/billing`;
        console.log(`[Tokens] Fetching billing from: ${billingUrl}`);

        const billingRes = await fetch(billingUrl, {
            method: 'GET',
            headers: {
                'Authorization': FLOWGLAD_SECRET_KEY,
                'Content-Type': 'application/json',
            },
        });

        if (!billingRes.ok) {
            const errText = await billingRes.text();
            console.warn(`[Tokens] Failed to fetch billing for user ${userId}: ${billingRes.status} - ${errText}`);
            // Return success with 0 tokens if user not found in Flowglad
            return res.json({ success: true, tokensAdded: 0, newBalance: getUserTokenData(userId).balance, purchasesProcessed: 0 });
        }

        const billingData = await billingRes.json();
        console.log(`[Tokens] Billing data:`, JSON.stringify(billingData, null, 2));

        // Build priceId -> priceSlug map (using price slug, not product slug)
        const priceIdToSlug = new Map<string, string>();
        if (billingData.catalog?.products) {
            for (const product of billingData.catalog.products) {
                // Map from defaultPrice.id to defaultPrice.slug
                if (product.defaultPrice?.id && product.defaultPrice?.slug) {
                    priceIdToSlug.set(product.defaultPrice.id, product.defaultPrice.slug);
                    console.log(`[Tokens] Mapped price ${product.defaultPrice.id} -> ${product.defaultPrice.slug}`);
                }
                // Also map from product prices array
                if (product.prices) {
                    for (const price of product.prices) {
                        if (price.id && price.slug) {
                            priceIdToSlug.set(price.id, price.slug);
                            console.log(`[Tokens] Mapped price ${price.id} -> ${price.slug}`);
                        }
                    }
                }
            }
        }

        // Get user's existing credited purchases (stored in tokenStore)
        const userData = getUserTokenData(userId);
        const creditedPurchases = new Set(userData.creditedPurchases ?? []);
        console.log(`[Tokens] Already credited purchases: ${[...creditedPurchases].join(', ') || 'none'}`);

        let tokensAdded = 0;
        const newCredits: string[] = [];

        // Check each purchase and credit tokens if not already credited
        if (billingData.purchases && Array.isArray(billingData.purchases)) {
            console.log(`[Tokens] Found ${billingData.purchases.length} purchases`);

            for (const purchase of billingData.purchases) {
                console.log(`[Tokens] Processing purchase: ${purchase.id}, priceId: ${purchase.priceId}`);

                // Skip if already credited
                if (creditedPurchases.has(purchase.id)) {
                    console.log(`[Tokens] Purchase ${purchase.id} already credited, skipping`);
                    continue;
                }

                // Get the price slug from the priceId
                const priceSlug = priceIdToSlug.get(purchase.priceId);
                console.log(`[Tokens] Purchase ${purchase.id} price slug: ${priceSlug}`);

                if (!priceSlug) {
                    console.log(`[Tokens] No price slug found for priceId ${purchase.priceId}`);
                    continue;
                }

                // Check if this is a token product
                const tokenProduct = getTokenProductByPriceSlug(priceSlug);
                if (tokenProduct) {
                    const tokens = tokenProduct.type === 'one_time' ? tokenProduct.tokens : tokenProduct.tokensPerPeriod;
                    creditTokens(userId, tokens, `flowglad purchase: ${purchase.id}`);
                    tokensAdded += tokens;
                    newCredits.push(purchase.id);
                    console.log(`[Tokens] ✅ Credited ${tokens} tokens to ${userId} for purchase ${purchase.id} (${priceSlug})`);
                } else {
                    console.log(`[Tokens] Price slug ${priceSlug} is not a token product`);
                }
            }
        } else {
            console.log(`[Tokens] No purchases found in billing data`);
        }

        // Update credited purchases list
        if (newCredits.length > 0) {
            userData.creditedPurchases = [...(userData.creditedPurchases ?? []), ...newCredits];
        }

        const newBalance = getUserTokenData(userId).balance;
        console.log(`[Tokens] Verification complete: ${tokensAdded} tokens added, new balance: ${newBalance}`);

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

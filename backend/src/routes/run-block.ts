import { Router } from 'express';
import { flowglad } from '../lib/flowglad.js';
import { getCustomerExternalId } from '../lib/auth.js';
import { getBlockById, type BlockId } from 'shared';
import { runBlock } from '../services/run-block.js';
import { deductTokens, getTokenBalance } from '../store/tokenStore.js';
import { getDemoEntitlements } from './checkout.js';

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const FLOWGLAD_API_URL = 'https://app.flowglad.com/api/v1';
const FLOWGLAD_SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;

export const runBlockRouter = Router();

// Helper to check if user has purchased a product
async function checkUserPurchase(userId: string, priceSlug: string, featureSlug: string): Promise<boolean> {
  if (!FLOWGLAD_SECRET_KEY) return false;

  try {
    const billingRes = await fetch(`${FLOWGLAD_API_URL}/customers/${userId}/billing`, {
      method: 'GET',
      headers: {
        'Authorization': FLOWGLAD_SECRET_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!billingRes.ok) {
      console.warn(`[RunBlock] Failed to fetch billing for user ${userId}: ${billingRes.status}`);
      return false;
    }

    const billingData = await billingRes.json() as {
      purchases?: Array<{ id: string; priceId: string; status: string }>;
      catalog?: {
        products?: Array<{
          id: string;
          slug: string;
          defaultPrice?: { id: string; slug: string };
          prices?: Array<{ id: string; slug: string }>;
        }>;
      };
    };

    // Build a map of priceId -> productSlug from the catalog
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

    // Check if user has purchased this product
    if (billingData.purchases) {
      for (const purchase of billingData.purchases) {
        const purchasedSlug = priceIdToSlug.get(purchase.priceId);
        if (purchasedSlug === priceSlug || purchasedSlug === featureSlug) {
          console.log(`[RunBlock] User ${userId} has purchased ${purchasedSlug}`);
          return true;
        }
      }
    }

    return false;
  } catch (e) {
    console.error('[RunBlock] Error checking purchases:', e);
    return false;
  }
}

runBlockRouter.post('/', async (req, res) => {
  try {
    const { blockId, inputs } = req.body as { blockId: BlockId; inputs: Record<string, string | string[]> };

    if (!blockId || inputs === undefined) {
      return res.status(400).json({ error: 'blockId and inputs required' });
    }

    const block = getBlockById(blockId);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    const userId = await getCustomerExternalId(req);

    // Check tokens (skip for free blocks with tokenCost 0)
    if (block.tokenCost > 0) {
      const balance = getTokenBalance(userId);
      if (balance < block.tokenCost) {
        return res.status(402).json({
          error: 'Insufficient tokens',
          message: `This block requires ${block.tokenCost} token(s). You have ${balance}.`,
          tokenCost: block.tokenCost,
          currentBalance: balance,
          needsPurchase: true,
        });
      }
    }

    // Feature access check 
    if (block.featureSlug !== 'free') {
      let hasAccess = false;

      if (DEMO_MODE) {
        // In demo mode, check our in-memory demo entitlements
        const userEntitlements = getDemoEntitlements(userId);
        hasAccess = userEntitlements.has(block.featureSlug);
        console.log(`[RunBlock/Demo] User ${userId} access to ${block.featureSlug}: ${hasAccess}`);
      } else {
        // Real Flowglad billing check - try SDK first
        try {
          const billing = await flowglad(userId).getBilling();
          hasAccess = billing.checkFeatureAccess(block.featureSlug);
        } catch (e) {
          console.warn('[RunBlock] SDK billing check failed:', e);
        }

        // If SDK says no access, check purchases directly
        if (!hasAccess) {
          hasAccess = await checkUserPurchase(userId, block.priceSlug, block.featureSlug);
        }

        console.log(`[RunBlock] User ${userId} access to ${block.featureSlug}: ${hasAccess}`);
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Block locked',
          message: 'Purchase or subscribe to unlock this block',
          priceSlug: block.priceSlug,
          featureSlug: block.featureSlug,
        });
      }
    }

    // Deduct tokens before running
    if (block.tokenCost > 0) {
      const result = deductTokens(userId, block.tokenCost);
      if (!result.success) {
        return res.status(402).json({
          error: 'Insufficient tokens',
          message: result.error,
          needsPurchase: true,
        });
      }
      console.log(`[Tokens] Deducted ${block.tokenCost} token(s) from ${userId}. New balance: ${result.newBalance}`);
    }

    // Run the block
    const result = await runBlock(blockId, inputs ?? {});

    // Log usage for Flowglad meters (if applicable)
    if (!DEMO_MODE && block.usageMeterSlug) {
      try {
        const billing = await flowglad(userId).getBilling();
        const subs = billing.subscriptions?.filter((s) => s.status === 'active') ?? [];
        const subId = subs[0]?.id;
        if (subId) {
          await flowglad(userId).createUsageEvent({
            amount: 1,
            usageMeterSlug: block.usageMeterSlug,
            subscriptionId: subId,
            transactionId: `run-${blockId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          });
        }
      } catch (e) {
        console.warn('[RunBlock] Usage logging failed:', e);
      }
    }

    const newBalance = getTokenBalance(userId);
    return res.json({
      success: true,
      outputs: result,
      tokensUsed: block.tokenCost,
      tokensRemaining: newBalance,
    });
  } catch (e) {
    console.error('run-block error', e);
    return res.status(500).json({ error: 'Failed to run block' });
  }
});

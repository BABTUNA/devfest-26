import { Router } from 'express';
import { flowglad } from '../lib/flowglad.js';
import { getCustomerExternalId } from '../lib/auth.js';
import { BLOCK_DEFINITIONS } from 'shared';
import { getDemoEntitlements } from './checkout.js';

export const entitlementsRouter = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const FLOWGLAD_API_URL = 'https://app.flowglad.com/api/v1';
const FLOWGLAD_SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;

// Types for Flowglad billing response
interface FlowgladPrice {
  id: string;
  slug: string;
  productId: string;
}

interface FlowgladPurchase {
  id: string;
  status: string;
  priceId: string;
  name?: string;
}

interface FlowgladProduct {
  id: string;
  slug: string;
  name: string;
  defaultPrice?: FlowgladPrice;
  prices?: FlowgladPrice[];
}

interface FlowgladBillingResponse {
  purchases?: FlowgladPurchase[];
  catalog?: {
    products?: FlowgladProduct[];
  };
}

entitlementsRouter.get('/', async (req, res) => {
  try {
    const userId = await getCustomerExternalId(req);
    const access: Record<string, boolean> = {};

    if (DEMO_MODE) {
      // In demo mode, check our in-memory demo entitlements store
      const userEntitlements = getDemoEntitlements(userId);
      for (const block of BLOCK_DEFINITIONS) {
        access[block.featureSlug] = block.featureSlug === 'free' || userEntitlements.has(block.featureSlug);
      }
      console.log(`[Entitlements/Demo] User ${userId} has access to:`, Object.entries(access).filter(([, v]) => v).map(([k]) => k));
      return res.json({ entitlements: access, billing: { subscriptions: [] } });
    }

    // --- Real Flowglad billing check ---

    // First, get user's purchases directly from Flowglad API
    const purchasedPriceSlugs = new Set<string>();

    if (FLOWGLAD_SECRET_KEY) {
      try {
        // Get customer billing details which includes purchases
        const billingRes = await fetch(`${FLOWGLAD_API_URL}/customers/${userId}/billing`, {
          method: 'GET',
          headers: {
            'Authorization': FLOWGLAD_SECRET_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (billingRes.ok) {
          const billingData = await billingRes.json() as FlowgladBillingResponse;

          console.log(`[Entitlements] User ${userId} billing data:`, JSON.stringify(billingData, null, 2).substring(0, 500));

          // Build a map of priceId -> priceSlug from the catalog
          const priceIdToSlug = new Map<string, string>();
          if (billingData.catalog?.products) {
            for (const product of billingData.catalog.products) {
              // Use product slug as the entitlement key
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

          // Check purchases and grant access
          if (billingData.purchases) {
            for (const purchase of billingData.purchases) {
              // Only count completed purchases (status might be 'completed' or similar)
              // For single_payment products, any purchase = access
              const priceSlug = priceIdToSlug.get(purchase.priceId);
              if (priceSlug) {
                purchasedPriceSlugs.add(priceSlug);
                console.log(`[Entitlements] User ${userId} purchased: ${priceSlug} (purchase: ${purchase.id})`);
              }
            }
          }
        } else {
          console.warn(`[Entitlements] Failed to fetch billing for user ${userId}: ${billingRes.status}`);
        }
      } catch (e) {
        console.error('[Entitlements] Error fetching billing from Flowglad:', e);
      }
    }

    // Check static blocks using SDK's feature access (fallback)
    try {
      const billing = await flowglad(userId).getBilling();
      for (const block of BLOCK_DEFINITIONS) {
        // Grant access if: feature is free, SDK says yes, or user purchased via price slug
        access[block.featureSlug] =
          block.featureSlug === 'free' ||
          billing.checkFeatureAccess(block.featureSlug) ||
          purchasedPriceSlugs.has(block.priceSlug) ||
          purchasedPriceSlugs.has(block.featureSlug);
      }
    } catch (e) {
      console.error('[Entitlements] SDK billing check failed:', e);
      // Fallback: just check purchases
      for (const block of BLOCK_DEFINITIONS) {
        access[block.featureSlug] =
          block.featureSlug === 'free' ||
          purchasedPriceSlugs.has(block.priceSlug) ||
          purchasedPriceSlugs.has(block.featureSlug);
      }
    }

    // Also add any dynamic products that were purchased
    for (const slug of purchasedPriceSlugs) {
      if (!access[slug]) {
        access[slug] = true;
      }
    }

    console.log(`[Entitlements] User ${userId} final access:`, Object.entries(access).filter(([, v]) => v).map(([k]) => k));

    res.json({
      entitlements: access,
      billing: { subscriptions: [] },
      purchasedSlugs: Array.from(purchasedPriceSlugs),
    });
  } catch (e) {
    console.error('entitlements error', e);
    res.status(500).json({ error: 'Failed to load entitlements' });
  }
});

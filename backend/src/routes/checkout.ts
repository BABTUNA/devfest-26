import { Router } from 'express';
import { flowglad } from '../lib/flowglad.js';
import { getCustomerExternalId } from '../lib/auth.js';
import { getBlockById, BLOCK_DEFINITIONS } from 'shared';

export const checkoutRouter = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';

// In-memory store for demo entitlements (replace with DB in production)
const demoEntitlements = new Map<string, Set<string>>();

export function getDemoEntitlements(userId: string): Set<string> {
  if (!demoEntitlements.has(userId)) {
    // In demo mode, grant access to all blocks by default
    const allFeatures = new Set<string>();
    for (const block of BLOCK_DEFINITIONS) {
      allFeatures.add(block.featureSlug);
    }
    demoEntitlements.set(userId, allFeatures);
  }
  return demoEntitlements.get(userId)!;
}

export function grantDemoEntitlement(userId: string, featureSlug: string): void {
  getDemoEntitlements(userId).add(featureSlug);
}

checkoutRouter.post('/', async (req, res) => {
  try {
    const userId = await getCustomerExternalId(req);
    const { priceSlug, successUrl, cancelUrl } = req.body as {
      priceSlug: string;
      successUrl: string;
      cancelUrl: string;
    };

    console.log(`[Checkout] Request for customer: ${userId}, price: ${priceSlug}`);

    if (!priceSlug || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'priceSlug, successUrl, cancelUrl required' });
    }

    // In DEMO_MODE, skip real checkout and grant access directly
    if (DEMO_MODE) {
      console.log(`[Checkout/Demo] Granting demo access for priceSlug: ${priceSlug}`);

      // Find the block by priceSlug and grant its feature
      const block = BLOCK_DEFINITIONS.find((b) => b.priceSlug === priceSlug);
      if (block) {
        grantDemoEntitlement(userId, block.featureSlug);
        console.log(`[Checkout/Demo] Granted feature: ${block.featureSlug} to user: ${userId}`);
      }

      // Return success URL so frontend redirects back
      return res.json({
        checkoutSession: {
          id: `demo_session_${Date.now()}`,
          url: successUrl,
        },
        demoMode: true,
        message: `Demo: Access granted for ${priceSlug}`,
      });
    }

    const fgClient = flowglad(userId);

    // Step 1: Ensure customer exists
    console.log('[Checkout] Creating/finding customer...');
    await fgClient.findOrCreateCustomer();
    console.log('[Checkout] Customer ready');

    // Step 2: Create checkout session
    console.log('[Checkout] Creating checkout session for priceSlug:', priceSlug);
    let result: unknown;
    try {
      result = await fgClient.createCheckoutSession({
        priceSlug,
        successUrl,
        cancelUrl,
      });
    } catch (checkoutError: unknown) {
      console.error('[Checkout] Flowglad createCheckoutSession threw:', checkoutError);
      const errObj = checkoutError as { message?: string; error?: string };
      return res.status(400).json({
        error: 'Flowglad checkout failed',
        details: errObj?.message || errObj?.error || String(checkoutError),
        hint: `Make sure price slug "${priceSlug}" exists in your Flowglad dashboard`,
      });
    }

    console.log('[Checkout] Raw Flowglad result:', JSON.stringify(result, null, 2));

    // Extract checkout URL from various possible response formats
    const resultObj = result as Record<string, unknown>;
    const checkoutSession = resultObj?.checkoutSession as Record<string, unknown> | undefined;

    // Try multiple possible URL field names
    const checkoutUrl =
      checkoutSession?.checkoutUrl as string | undefined ??
      checkoutSession?.url as string | undefined ??
      resultObj?.checkoutUrl as string | undefined ??
      resultObj?.url as string | undefined;

    if (!checkoutUrl) {
      console.error('[Checkout] No checkout URL found in response:', JSON.stringify(result, null, 2));
      return res.status(500).json({
        error: 'Checkout URL missing from Flowglad response',
        details: `The price slug "${priceSlug}" may not exist in your Flowglad dashboard, or the price may not be configured for checkout.`,
        rawResponse: result,
      });
    }

    console.log('[Checkout] Success! Checkout URL:', checkoutUrl);

    // Return normalized response
    res.json({
      checkoutSession: {
        id: checkoutSession?.id ?? resultObj?.id,
        url: checkoutUrl,
      },
    });
  } catch (e: unknown) {
    // Extract detailed error info
    const err = e as { message?: string; error?: { error?: string }; status?: number };
    const message = err?.error?.error || err?.message || 'Unknown error';
    const status = err?.status || 500;

    console.error('[Checkout] Error:', message);
    console.error('[Checkout] Full error:', JSON.stringify(e, null, 2));

    res.status(status).json({ error: message });
  }
});

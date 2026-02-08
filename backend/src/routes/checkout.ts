import { Router } from 'express';
import { flowglad } from '../lib/flowglad.js';
import { getCustomerExternalId } from '../lib/auth.js';
import { BLOCK_DEFINITIONS } from 'shared';

export const checkoutRouter = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';

const demoEntitlements = new Map<string, Set<string>>();

export function getDemoEntitlements(userId: string): Set<string> {
  if (!demoEntitlements.has(userId)) {
    demoEntitlements.set(userId, new Set());
  }
  return demoEntitlements.get(userId)!;
}

export function grantDemoEntitlement(userId: string, featureSlug: string): void {
  getDemoEntitlements(userId).add(featureSlug);
}

checkoutRouter.post('/', async (req, res) => {
  try {
    const userId = await getCustomerExternalId(req);
    const { priceSlug, priceSlugs, successUrl, cancelUrl, outputName, outputMetadata } = req.body as {
      priceSlug: string;
      priceSlugs?: string[];
      successUrl: string;
      cancelUrl: string;
      outputName?: string;
      outputMetadata?: Record<string, string | number | boolean>;
    };

    const candidates = [priceSlug, ...(Array.isArray(priceSlugs) ? priceSlugs : [])].filter(
      (slug, index, arr): slug is string => typeof slug === 'string' && slug.length > 0 && arr.indexOf(slug) === index
    );

    console.log(`[Checkout] Request for customer: ${userId}, prices: ${candidates.join(', ')}`);

    if (!candidates.length || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'priceSlug (or priceSlugs), successUrl, cancelUrl required' });
    }

    if (DEMO_MODE) {
      for (const candidate of candidates) {
        const block = BLOCK_DEFINITIONS.find((b) => b.priceSlug === candidate);
        if (block) {
          grantDemoEntitlement(userId, block.featureSlug);
        }
      }

      return res.json({
        checkoutSession: {
          id: `demo_session_${Date.now()}`,
          url: successUrl,
        },
        demoMode: true,
      });
    }

    const fgClient = flowglad(userId);

    // Step 1: Ensure customer exists
    console.log('[Checkout] Creating/finding customer...');
    await fgClient.findOrCreateCustomer();
    console.log('[Checkout] Customer ready');

    // Step 2: Create checkout session
    console.log('[Checkout] Creating checkout session...');
    let result: unknown;
    let selectedPriceSlug: string | null = null;
    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        result = await fgClient.createCheckoutSession({
          priceSlug: candidate,
          successUrl,
          cancelUrl,
          outputName,
          outputMetadata,
        });
        selectedPriceSlug = candidate;
        break;
      } catch (error) {
        lastError = error;
        const message =
          typeof error === 'object' && error && 'message' in error
            ? String((error as { message?: unknown }).message ?? '')
            : '';
        if (!message.toLowerCase().includes('not found')) {
          throw error;
        }
      }
    }

    if (!selectedPriceSlug) {
      const fallbackMessage = `Unable to create checkout session. Tried price slugs: ${candidates.join(', ')}`;
      if (lastError && typeof lastError === 'object') {
        const message = 'message' in lastError ? String((lastError as { message?: unknown }).message ?? '') : '';
        throw new Error(message ? `${fallbackMessage}. Last error: ${message}` : fallbackMessage);
      }
      throw new Error(fallbackMessage);
    }

    console.log(`[Checkout] Success with priceSlug="${selectedPriceSlug}"`, JSON.stringify(result, null, 2));
    const topLevelUrl =
      typeof result === 'object' && result && 'url' in result
        ? (result as { url?: unknown }).url
        : undefined;
    const rawSession =
      typeof result === 'object' && result && 'checkoutSession' in result
        ? (result as { checkoutSession?: unknown }).checkoutSession
        : result;
    const sessionUrlFromNested =
      typeof rawSession === 'object' && rawSession && 'url' in rawSession
        ? (rawSession as { url?: unknown }).url
        : undefined;
    const finalUrl = typeof sessionUrlFromNested === 'string' && sessionUrlFromNested
      ? sessionUrlFromNested
      : typeof topLevelUrl === 'string' && topLevelUrl
        ? topLevelUrl
        : undefined;

    if (!finalUrl) {
      return res.status(502).json({
        error: 'Checkout session missing URL from Flowglad. Verify DEMO_MODE=false, FLOWGLAD_SECRET_KEY, and valid priceSlug.',
      });
    }

    const checkoutSession =
      rawSession && typeof rawSession === 'object'
        ? ({ ...(rawSession as Record<string, unknown>), url: finalUrl })
        : { url: finalUrl };

    res.json({ checkoutSession });
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

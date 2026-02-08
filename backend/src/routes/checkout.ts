import { Router } from 'express';
import { flowglad } from '../lib/flowglad.js';
import { getCustomerExternalId, requireAuth } from '../lib/auth.js';

export const checkoutRouter = Router();

checkoutRouter.post('/', requireAuth, async (req, res) => {
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

    const fgClient = flowglad(userId);

    // Step 1: Ensure customer exists
    console.log('[Checkout] Creating/finding customer...');
    await fgClient.findOrCreateCustomer();
    console.log('[Checkout] Customer ready');

    // Step 2: Create checkout session
    console.log('[Checkout] Creating checkout session...');
    const result = await fgClient.createCheckoutSession({
      priceSlug,
      successUrl,
      cancelUrl,
    });

    console.log('[Checkout] Success:', JSON.stringify(result, null, 2));
    res.json(result);
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

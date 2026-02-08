import { Router } from 'express';
import { flowglad } from '../lib/flowglad.js';
import { getCustomerExternalId, requireAuth } from '../lib/auth.js';
import { BLOCK_DEFINITIONS } from 'shared';

export const entitlementsRouter = Router();

entitlementsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const userId = await getCustomerExternalId(req);
    const billing = await flowglad(userId).getBilling();
    const access: Record<string, boolean> = {};
    for (const block of BLOCK_DEFINITIONS) {
      access[block.featureSlug] = billing.checkFeatureAccess(block.featureSlug);
    }
    res.json({ entitlements: access, billing: { subscriptions: billing.subscriptions } });
  } catch (e) {
    console.error('entitlements error', e);
    res.status(500).json({ error: 'Failed to load entitlements' });
  }
});

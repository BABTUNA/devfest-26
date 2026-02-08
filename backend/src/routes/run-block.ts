import { Router } from 'express';
import { flowglad } from '../lib/flowglad.js';
import { getCustomerExternalId, requireAuth } from '../lib/auth.js';
import { getBlockById, type BlockId } from 'shared';
import { runBlock } from '../services/run-block.js';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

export const runBlockRouter = Router();

runBlockRouter.post('/', requireAuth, async (req, res) => {
  try {
    const { blockId, inputs } = req.body as { blockId: BlockId; inputs: Record<string, string | string[]> };

    if (!blockId || inputs === undefined) {
      return res.status(400).json({ error: 'blockId and inputs required' });
    }

    const block = getBlockById(blockId);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    if (!DEMO_MODE) {
      const userId = await getCustomerExternalId(req);
      const billing = await flowglad(userId).getBilling();
      const hasAccess = billing.checkFeatureAccess(block.featureSlug);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Block locked',
          message: 'Purchase or subscribe to unlock this block',
          priceSlug: block.priceSlug,
          featureSlug: block.featureSlug,
        });
      }
    }

    const result = await runBlock(blockId, inputs ?? {});

    if (!DEMO_MODE && block.usageMeterSlug) {
      const userId = await getCustomerExternalId(req);
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
    }

    return res.json({ success: true, outputs: result });
  } catch (e) {
    console.error('run-block error', e);
    return res.status(500).json({ error: 'Failed to run block' });
  }
});

import { Router } from 'express';
import { getCustomerExternalId, requireAuth } from '../lib/auth.js';
import { BLOCK_DEFINITIONS } from 'shared';
import { getWorkflowById, getWorkflowsByIds } from '../services/workflows.js';
import { evaluateWorkflowCheckoutGate } from '../services/checkoutGating.js';
import { supabase } from '../lib/supabase.js';

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

function logWorkflowGate(payload: Record<string, unknown>): void {
  console.log(`[Checkout][WorkflowGate] ${JSON.stringify(payload)}`);
}

/**
 * Simple checkout: directly creates purchase record without Flowglad.
 * No payment processing - just grants access immediately.
 */
checkoutRouter.post('/', requireAuth, async (req, res) => {
  try {
    const userId = await getCustomerExternalId(req);
    const { successUrl, workflowId } = req.body as {
      successUrl: string;
      cancelUrl?: string;
      workflowId?: string;
    };

    if (!successUrl) {
      return res.status(400).json({ error: 'successUrl required' });
    }

    // Handle workflow checkout (no Flowglad, just direct purchase)
    if (workflowId) {
      const workflow = await getWorkflowById(workflowId);
      const includedWorkflows = workflow?.includes?.length ? await getWorkflowsByIds(workflow.includes) : [];
      const gateResult = evaluateWorkflowCheckoutGate({
        workflow,
        buyerUserId: userId,
        includedWorkflows,
      });

      const gateContext = {
        workflow_id: workflowId,
        buyer_user_id: userId,
        workflow_owner_user_id: workflow?.owner_user_id ?? null,
        includes_count: workflow?.includes?.length ?? 0,
      };

      if (!gateResult.allowed) {
        logWorkflowGate({
          ...gateContext,
          reason: gateResult.reason,
          allowed: false,
          ...(gateResult.details ?? {}),
        });

        return res.status(gateResult.status).json({
          error: gateResult.error,
          reason: gateResult.reason,
        });
      }

      // Create purchase record directly (no payment processing)
      const { error: purchaseError } = await supabase
        .from('purchases')
        .upsert({
          buyer_user_id: userId,
          workflow_id: workflowId,
          status: 'paid',
          provider: 'direct',
          amount: 0,
          currency: 'USD',
          metadata: { direct_checkout: true },
        }, { onConflict: 'buyer_user_id,workflow_id' });

      if (purchaseError) {
        console.error('[Checkout] Failed to create purchase:', purchaseError);
        return res.status(500).json({ error: 'Failed to record purchase' });
      }

      logWorkflowGate({
        ...gateContext,
        reason: gateResult.reason,
        allowed: true,
        purchase_created: true,
      });

      console.log(`[Checkout] Direct purchase created for workflow ${workflowId} by user ${userId}`);

      // Return success URL directly (no external checkout)
      return res.json({
        checkoutSession: {
          id: `direct_${workflowId}_${Date.now()}`,
          url: successUrl,
        },
        direct: true,
      });
    }

    // Handle block checkout (demo mode only for now)
    if (DEMO_MODE) {
      return res.json({
        checkoutSession: {
          id: `demo_session_${Date.now()}`,
          url: successUrl,
        },
        demoMode: true,
      });
    }

    return res.status(400).json({ error: 'workflowId required for checkout' });
  } catch (e: unknown) {
    const err = e as { message?: string };
    const message = err?.message || 'Unknown error';

    console.error('[Checkout] Error:', message);
    res.status(500).json({ error: message });
  }
});

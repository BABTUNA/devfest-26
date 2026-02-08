import type { Workflow } from '../lib/supabase.js';

export type WorkflowGateReason =
  | 'workflow_not_found'
  | 'owner_cannot_purchase'
  | 'workflow_checkout_allowed';

export type WorkflowCheckoutGateResult =
  | {
      allowed: true;
      reason: 'workflow_checkout_allowed';
    }
  | {
      allowed: false;
      reason: Exclude<WorkflowGateReason, 'workflow_checkout_allowed'>;
      status: 400 | 404;
      error: string;
      details?: Record<string, unknown>;
    };

/**
 * Simple checkout gating for workflows without commerce columns.
 * Only checks: workflow exists and buyer is not the owner.
 */
export function evaluateWorkflowCheckoutGate(input: {
  workflow: Workflow | null;
  buyerUserId: string;
  includedWorkflows: Workflow[];
}): WorkflowCheckoutGateResult {
  const { workflow, buyerUserId } = input;

  if (!workflow) {
    return {
      allowed: false,
      reason: 'workflow_not_found',
      status: 404,
      error: 'Workflow not found',
    };
  }

  if (workflow.owner_user_id === buyerUserId) {
    return {
      allowed: false,
      reason: 'owner_cannot_purchase',
      status: 400,
      error: 'Owners cannot purchase their own workflow.',
    };
  }

  // Allow checkout - no price/publish checks since commerce columns don't exist
  return {
    allowed: true,
    reason: 'workflow_checkout_allowed',
  };
}

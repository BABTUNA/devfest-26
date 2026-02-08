import { supabase } from '../lib/supabase.js';

export type ConfirmedWorkflowPurchaseInput = {
  buyerUserId: string;
  workflowId: string;
  provider: 'flowglad';
  providerPaymentId: string | null;
  providerEventId: string;
  amount?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
};

export function canAccessWorkflow(params: {
  workflowOwnerUserId: string;
  requesterUserId: string;
  hasPaidPurchase: boolean;
}): boolean {
  return params.workflowOwnerUserId === params.requesterUserId || params.hasPaidPurchase;
}

export async function upsertConfirmedWorkflowPurchase(input: ConfirmedWorkflowPurchaseInput): Promise<void> {
  const payload = {
    buyer_user_id: input.buyerUserId,
    workflow_id: input.workflowId,
    status: 'paid' as const,
    provider: input.provider,
    provider_payment_id: input.providerPaymentId,
    provider_event_id: input.providerEventId,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    metadata: input.metadata ?? {},
  };

  const { error } = await supabase
    .from('purchases')
    .upsert(payload, { onConflict: 'buyer_user_id,workflow_id' });

  if (error) {
    throw new Error(`Failed to upsert confirmed purchase: ${error.message}`);
  }
}

export async function hasPaidWorkflowPurchase(buyerUserId: string, workflowId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('buyer_user_id', buyerUserId)
    .eq('workflow_id', workflowId)
    .eq('status', 'paid')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check workflow purchase access: ${error.message}`);
  }

  return Boolean(data);
}

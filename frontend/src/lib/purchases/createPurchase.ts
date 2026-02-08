import { getSupabaseClient } from '@/lib/supabase';

export type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type Purchase = {
    id: string;
    buyer_user_id: string;
    workflow_id: string;
    status: PurchaseStatus;
    provider: string;
    provider_payment_id: string | null;
    amount: number | null;
    currency: string | null;
    created_at: string;
};

export type CreatePurchaseParams = {
    workflowId: string;
    userId: string;
    provider: string;
    providerPaymentId?: string | null;
    amount?: number | null;
    currency?: string | null;
    status?: PurchaseStatus;
};

/**
 * Create a new purchase record in Supabase
 */
export async function createPurchase(params: CreatePurchaseParams): Promise<Purchase> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from('purchases')
        .insert({
            buyer_user_id: params.userId,
            workflow_id: params.workflowId,
            status: params.status ?? 'pending',
            provider: params.provider,
            provider_payment_id: params.providerPaymentId ?? null,
            amount: params.amount ?? null,
            currency: params.currency ?? null,
        })
        .select()
        .single();

    if (error) {
        // Handle unique constraint violation (duplicate purchase)
        if (error.code === '23505') {
            throw new Error('You have already purchased this workflow');
        }
        throw new Error(error.message || 'Failed to create purchase');
    }

    return data as Purchase;
}

/**
 * Update purchase status
 */
export async function updatePurchaseStatus(
    purchaseId: string,
    status: PurchaseStatus,
    providerPaymentId?: string
): Promise<Purchase> {
    const supabase = getSupabaseClient();

    const updateData: Record<string, unknown> = { status };
    if (providerPaymentId) {
        updateData.provider_payment_id = providerPaymentId;
    }

    const { data, error } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', purchaseId)
        .select()
        .single();

    if (error) {
        throw new Error(error.message || 'Failed to update purchase');
    }

    return data as Purchase;
}

/**
 * Check if user has already purchased a workflow
 * Checks for both 'paid' and 'pending' purchases to prevent duplicates
 */
export async function checkExistingPurchase(
    userId: string,
    workflowId: string
): Promise<Purchase | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('buyer_user_id', userId)
        .eq('workflow_id', workflowId)
        .in('status', ['paid', 'pending'])
        .maybeSingle();

    if (error) {
        console.error('Error checking existing purchase:', error);
        return null;
    }

    return data as Purchase | null;
}

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

// createPurchase and updatePurchaseStatus removed in favor of backend flow

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

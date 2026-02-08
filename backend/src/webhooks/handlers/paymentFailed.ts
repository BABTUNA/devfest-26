/**
 * Payment Failed webhook handler
 * 
 * Handles payment.failed events from Flowglad
 */

import { PaymentFailedEvent } from '../types.js';
import { logWebhook } from '../logging.js';

// In-memory set to track accounts at risk (for demo purposes)
// Future: Replace with database column on users table
const billingRiskAccounts = new Set<string>();

/**
 * Handle payment.failed event
 * 
 * Side effects:
 * 1. Log the payment failure with customer details
 * 2. Mark account as "at risk" (stub: in-memory flag)
 * 3. Throttle expensive operations (stub: interface for future queue integration)
 * 4. Notify user (stub: interface for future notification system)
 * 
 * What NOT to do:
 * - Do NOT revoke entitlements (Flowglad SDK is source of truth)
 * - Do NOT perform heavy AI processing (must respond <10s)
 * - Do NOT make blocking external API calls
 * 
 * @param event - The payment.failed webhook event
 */
export async function handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const { customer, id, failureReason } = event;

    // 1. Log failure with structured data
    logWebhook('payment.failed.handled', id, {
        customerId: customer.id,
        externalId: customer.externalId,
        paymentId: id,
        failureReason: failureReason || 'unknown',
    });

    // 2. Mark account as "at risk" (stub: in-memory for demo)
    billingRiskAccounts.add(customer.externalId);
    console.log(`[webhook] Account at risk: ${customer.externalId}`);

    // Future DB implementation:
    // await db.users.update({
    //   where: { externalId: customer.externalId },
    //   data: { billingStatus: 'at_risk', billingStatusUpdatedAt: new Date() }
    // });

    // 3. Throttle expensive operations (stub: interface for future queue integration)
    console.log(`[webhook] Would throttle user: ${customer.externalId}`);

    // Future queue integration:
    // await runQueue.pauseForUser(customer.externalId);
    // This would prevent new expensive AI block runs until billing is resolved

    // 4. Notify user (stub: interface for future notification system)
    console.log(`[webhook] Would send payment failure email to: ${customer.externalId}`);

    // Future notification integration:
    // await notifications.send({
    //   to: customer.email, // Would need to fetch from DB
    //   template: 'payment-failed',
    //   data: {
    //     paymentId: id,
    //     reason: failureReason,
    //     retryUrl: `${FRONTEND_URL}/billing`,
    //   }
    // });
}

/**
 * Check if an account is marked as at risk
 * (Helper function for future use in other parts of the codebase)
 */
export function isAccountAtRisk(externalId: string): boolean {
    return billingRiskAccounts.has(externalId);
}

/**
 * Clear at-risk status (for when payment succeeds)
 */
export function clearAccountRisk(externalId: string): void {
    billingRiskAccounts.delete(externalId);
}

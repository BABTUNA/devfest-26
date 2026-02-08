/**
 * Template for creating new webhook event handlers
 * 
 * Copy this file and implement the handler logic for specific event types
 */

import { FlowgladWebhookEvent } from '../types.js';
import { logWebhook } from '../logging.js';

/**
 * Template handler function
 * 
 * @param event - The webhook event to process
 */
export async function handleTemplateEvent(event: FlowgladWebhookEvent): Promise<void> {
    // 1. Log the event
    logWebhook('template.handled', event.id, {
        eventType: event.type,
        customerId: 'customer' in event ? event.customer?.id : undefined,
    });

    // 2. Implement your business logic here
    // Examples:
    // - Update database records
    // - Send notifications
    // - Trigger background jobs
    // - Update cache

    // 3. Keep handlers fast (must respond within 10 seconds)
    // 4. Make handlers idempotent (can be called multiple times safely)
    // 5. Don't throw errors for business logic - log and continue
    // 6. Return 200 OK to prevent retries
}

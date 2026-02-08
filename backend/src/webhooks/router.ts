/**
 * Event router - dispatches webhook events to appropriate handlers
 */

import { FlowgladWebhookEvent } from './types.js';
import { handlers } from './handlers/index.js';
import { logWebhook, logWebhookError } from './logging.js';

/**
 * Route webhook event to the appropriate handler
 * 
 * @param event - The verified webhook event
 * @returns void
 */
export async function routeEvent(event: FlowgladWebhookEvent): Promise<void> {
    const handler = handlers[event.type];

    if (!handler) {
        // Unknown event type - log and continue (graceful handling)
        logWebhook('unknown-event', event.id, {
            eventType: event.type,
            message: 'No handler registered for this event type',
        });
        return;
    }

    try {
        // Execute the handler
        await handler(event);

        // Log successful handling
        logWebhook('handled', event.id, {
            eventType: event.type,
        });
    } catch (error) {
        // Log handler errors but don't throw (return 200 to prevent retries)
        const err = error as Error;
        logWebhookError('handler-failed', event.id, err, {
            eventType: event.type,
        });
    }
}

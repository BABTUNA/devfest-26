/**
 * Main Flowglad webhook handler
 */

import { Request, Response } from 'express';
import { verifyWebhook, WebhookVerificationError } from './verify.js';
import { getWebhookConfig } from './config.js';
import { logWebhook, logWebhookError, recordWebhookMetric } from './logging.js';
import { routeEvent } from './router.js';
import { FlowgladWebhookEvent } from './types.js';
import { reserveFlowgladWebhookEvent } from '../services/webhookEvents.js';

/**
 * Main webhook handler - verifies signature, deduplicates, and processes events
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
        // Get webhook configuration
        const config = getWebhookConfig();

        // req.body is a Buffer from express.raw() middleware
        const rawBody = req.body as Buffer;

        // Verify webhook signature
        const payload = verifyWebhook(
            rawBody,
            req.headers as Record<string, string>,
            config.secret
        );

        const event = payload as FlowgladWebhookEvent;

        // Record metric: webhook received
        recordWebhookMetric('webhook.received.total', 1, {
            eventType: event.type,
            mode: config.mode,
        });

        // Durable idempotency: reserve event id in DB. Duplicate insert means already processed.
        const reserveResult = await reserveFlowgladWebhookEvent(
            event.id,
            event.type,
            event as unknown as Record<string, unknown>
        );
        if (reserveResult === 'duplicate') {
            const durationMs = Date.now() - startTime;
            logWebhook('duplicate', event.id, {
                eventType: event.type,
                mode: config.mode,
                durationMs,
            });

            // Record metric: duplicate detected
            recordWebhookMetric('webhook.duplicate.total', 1, {
                eventType: event.type,
            });

            // Return 200 OK for duplicates (already processed)
            res.status(200).json({ received: true, duplicate: true });
            return;
        }

        // Route event to appropriate handler
        await routeEvent(event);

        // Calculate processing time
        const durationMs = Date.now() - startTime;

        // Log successful processing
        logWebhook('processed', event.id, {
            eventType: event.type,
            mode: config.mode,
            durationMs,
        });

        // Record metrics
        recordWebhookMetric('webhook.processed.total', 1, {
            eventType: event.type,
            mode: config.mode,
        });
        recordWebhookMetric('webhook.processing_duration_ms', durationMs, {
            eventType: event.type,
        });

        // Return 200 OK
        res.status(200).json({ received: true });

    } catch (error) {
        if (error instanceof WebhookVerificationError) {
            // Log verification failure
            logWebhookError('verification-failed', 'unknown', error);

            // Record metric
            recordWebhookMetric('webhook.verification_failed.total', 1, {
                reason: error.message,
            });

            res.status(400).json({ error: 'Webhook verification failed', message: error.message });
            return;
        }

        // Log unexpected errors
        const err = error as Error;
        logWebhookError('handler-error', 'unknown', err);

        // Record metric
        recordWebhookMetric('webhook.error.total', 1, {
            errorType: err.name,
        });

        res.status(500).json({ error: 'Internal server error' });
    }
}

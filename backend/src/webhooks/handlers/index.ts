/**
 * Webhook event handler registry and type definitions
 */

import { FlowgladWebhookEvent } from '../types.js';
import { handlePaymentFailed } from './paymentFailed.js';

import { handlePaymentSucceeded, handlePurchaseCompleted } from './paymentSucceeded.js';

export type WebhookHandler = (event: FlowgladWebhookEvent) => Promise<void>;

export type WebhookHandlerRegistry = {
    [K in FlowgladWebhookEvent['type']]?: WebhookHandler;
};

/**
 * Registry of webhook event handlers
 * 
 * Add handlers here as they are implemented
 */
export const handlers: WebhookHandlerRegistry = {
    'payment.failed': handlePaymentFailed as WebhookHandler,
    'payment.succeeded': handlePaymentSucceeded as WebhookHandler,
    'purchase.completed': handlePurchaseCompleted as WebhookHandler,
};

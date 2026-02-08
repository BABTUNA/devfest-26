import { Router, raw } from 'express';
import { handleWebhook } from '../webhooks/index.js';

export const webhookRouter = Router();

/**
 * Flowglad webhook endpoint with signature verification
 * 
 * CRITICAL: Uses express.raw() middleware to preserve raw body for signature verification.
 * The raw body is required to verify the HMAC signature sent by Flowglad.
 */
webhookRouter.post('/', raw({ type: 'application/json' }), handleWebhook);

/**
 * Flowglad webhook signature verification (Svix-style)
 */

import crypto from 'crypto';

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

interface WebhookHeaders {
  'svix-id'?: string;
  'svix-timestamp'?: string;
  'svix-signature'?: string;
}

/**
 * Verify Flowglad webhook signature using Svix-style headers
 * 
 * @param rawBody - Raw request body as Buffer or string
 * @param headers - Request headers containing svix-* fields
 * @param secret - Webhook secret (format: whsec_<base64-key>)
 * @param toleranceSeconds - Max age of webhook (default: 300s = 5min)
 * @returns Parsed JSON payload if verification succeeds
 * @throws WebhookVerificationError if verification fails
 */
export function verifyWebhook(
  rawBody: Buffer | string,
  headers: WebhookHeaders,
  secret: string,
  toleranceSeconds: number = 300
): unknown {
  // Extract required headers
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signature = headers['svix-signature'];
  
  if (!id || !timestamp || !signature) {
    throw new WebhookVerificationError('Missing required signature headers (svix-id, svix-timestamp, svix-signature)');
  }
  
  // Convert raw body to string if Buffer
  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  
  // Decode webhook secret (strip whsec_ prefix and base64 decode)
  if (!secret.startsWith('whsec_')) {
    throw new WebhookVerificationError('Invalid secret format (must start with whsec_)');
  }
  const secretKey = Buffer.from(secret.split('_')[1], 'base64');
  
  // Construct signed content: <id>.<timestamp>.<raw-body>
  const signedContent = `${id}.${timestamp}.${bodyString}`;
  
  // Compute expected signature using HMAC SHA-256
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signedContent)
    .digest('base64');
  
  // Extract signature from v1,<signature> format
  const [version, sig] = signature.split(',');
  if (version !== 'v1' || !sig) {
    throw new WebhookVerificationError('Invalid signature format (expected v1,<base64-signature>)');
  }
  
  // Timing-safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(sig, 'base64');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64');
  
  if (sigBuffer.length !== expectedBuffer.length || 
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new WebhookVerificationError('Signature verification failed');
  }
  
  // Validate timestamp (prevent replay attacks)
  const webhookTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const age = currentTime - webhookTime;
  
  // Reject if older than tolerance (default 5 minutes)
  if (toleranceSeconds !== null && age > toleranceSeconds) {
    throw new WebhookVerificationError(`Webhook timestamp is too old (${age}s > ${toleranceSeconds}s)`);
  }
  
  // Reject if timestamp is too far in future (clock skew protection)
  if (webhookTime > currentTime + 60) {
    throw new WebhookVerificationError('Webhook timestamp is too far in the future');
  }
  
  // Parse and return JSON payload
  try {
    return JSON.parse(bodyString);
  } catch (error) {
    throw new WebhookVerificationError('Invalid JSON payload');
  }
}

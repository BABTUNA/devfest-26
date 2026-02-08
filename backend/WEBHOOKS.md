# Flowglad Webhooks Setup Guide

## Overview

This implementation provides secure webhook support for Flowglad billing events. The webhook system is modular, isolated under `backend/src/webhooks/`, and handles signature verification, idempotency, and event routing.

## Architecture

```
backend/src/webhooks/
├── index.ts                    # Main handler (verification + orchestration)
├── config.ts                   # Environment configuration
├── verify.ts                   # Svix-style signature verification
├── types.ts                    # Event type definitions
├── router.ts                   # Event dispatcher
├── logging.ts                  # Structured logging
├── idempotency/
│   ├── store.ts                # Abstract interface
│   └── memory.ts               # In-memory implementation
├── handlers/
│   ├── index.ts                # Handler registry
│   ├── paymentFailed.ts        # payment.failed handler
│   └── _template.ts            # Template for new handlers
└── tests/
    ├── index.ts                # Test runner
    ├── verify.test.ts          # Signature verification tests
    ├── router.test.ts          # Event routing tests
    └── fixtures/               # Test data
        ├── payment-failed.json
        └── webhook-secret.txt
```

## Quick Start

### 1. Configure Environment Variables

Add to `backend/.env`:

```bash
# Webhook signing secret from Flowglad dashboard
FLOWGLAD_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# Optional: Mode-specific secrets
# FLOWGLAD_WEBHOOK_SECRET_TEST=whsec_test_...
# FLOWGLAD_WEBHOOK_SECRET_LIVE=whsec_live_...

# Webhook mode: 'test' or 'live'
FLOWGLAD_WEBHOOK_MODE=test
```

### 2. Configure Webhook in Flowglad Dashboard

1. Go to [app.flowglad.com/settings](https://app.flowglad.com/settings)
2. Navigate to **API** → **Webhooks** → **Create Webhook**
3. Enter your webhook URL:
   - **Local dev:** Use a tunnel service (ngrok, cloudflared)
   - **Production:** `https://yourdomain.com/api/webhook`
4. Select event types to subscribe to:
   - `payment.failed` (implemented)
   - Add others as needed
5. Copy the signing secret and add to `.env`

### 3. Test Locally

```bash
# Run the webhook tests
npm run dev
cd backend/src/webhooks/tests
npx tsx index.ts
```

## Supported Events

Currently implemented handlers:

| Event Type | Handler | Description |
|------------|---------|-------------|
| `payment.failed` | `paymentFailed.ts` | Payment attempt failed (card declined, etc.) |

Additional events supported (no handlers yet):
- `customer.created`
- `customer.updated`
- `payment.succeeded`
- `purchase.completed`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

## Security

### Signature Verification

All webhooks are verified using Svix-style HMAC SHA-256 signatures:

1. **Headers checked:** `svix-id`, `svix-timestamp`, `svix-signature`
2. **Signed content:** `<id>.<timestamp>.<raw-body>`
3. **Algorithm:** HMAC SHA-256 with base64-encoded secret
4. **Timestamp validation:** Rejects events >5 minutes old or >60s in future
5. **Timing-safe comparison:** Prevents timing attacks

**Invalid webhooks receive 400 Bad Request.**

### Idempotency

- Events are deduplicated by `eventId`
- In-memory store for MVP (lost on restart)
- TTL: 24 hours
- Duplicate deliveries return `200 OK` without reprocessing

## Adding New Event Handlers

### Step 1: Define Event Type (if needed)

Add to `backend/src/webhooks/types.ts`:

```typescript
export interface YourNewEvent extends WebhookEvent {
  type: 'your.event';
  object: 'your_object';
  customer: CustomerInfo;
  // Add event-specific fields
}

// Add to union type
export type FlowgladWebhookEvent =
  | PaymentFailedEvent
  | YourNewEvent  // Add here
  | ...;
```

### Step 2: Create Handler

Copy `backend/src/webhooks/handlers/_template.ts` to a new file:

```typescript
// backend/src/webhooks/handlers/yourHandler.ts
import { YourNewEvent } from '../types.js';
import { logWebhook } from '../logging.js';

export async function handleYourEvent(event: YourNewEvent): Promise<void> {
  const { customer, id } = event;
  
  // Log event
  logWebhook('your.event.handled', id, {
    customerId: customer.id,
    externalId: customer.externalId,
  });
  
  // Implement your business logic
  // - Keep fast (<10s response time)
  // - Make idempotent
  // - Log errors, don't throw
}
```

### Step 3: Register Handler

Update `backend/src/webhooks/handlers/index.ts`:

```typescript
import { handleYourEvent } from './yourHandler.js';

export const handlers: WebhookHandlerRegistry = {
  'payment.failed': handlePaymentFailed as WebhookHandler,
  'your.event': handleYourEvent as WebhookHandler, // Add here
};
```

## Payment Failed Handler

Current implementation for `payment.failed` events:

### Side Effects

1. **Logging:** Structured log with customer ID, payment ID, failure reason
2. **Account flagging:** Marks account as "at risk" (in-memory for MVP)
3. **Throttling (stub):** Interface for future queue integration
4. **Notifications (stub):** Interface for future email/notification system

### What It Does NOT Do

- ❌ Revoke entitlements (Flowglad SDK is source of truth)
- ❌ Heavy processing (must respond <10s)
- ❌ Block external API calls

### Production Migration Path

To make production-ready, replace stubs with:

```typescript
// 1. Database storage for billing status
await db.users.update({
  where: { externalId: customer.externalId },
  data: { billingStatus: 'at_risk' }
});

// 2. Queue integration for throttling
await runQueue.pauseForUser(customer.externalId);

// 3. Notification system
await notifications.send({
  to: customer.email,
  template: 'payment-failed',
  data: { paymentId: event.id }
});
```

## Local Development

### Using Ngrok for Testing

```bash
# Start ngrok tunnel
ngrok http 4000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Configure in Flowglad dashboard: https://abc123.ngrok.io/api/webhook
```

### Manual Testing with curl

```bash
# Generate a valid signature (use tests/verify.test.ts)
# Then send a test webhook:

curl -X POST http://localhost:4000/api/webhook \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test123" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,YOUR_SIGNATURE_HERE" \
  -d @backend/src/webhooks/tests/fixtures/payment-failed.json
```

### Viewing Logs

All webhook events are logged with structured JSON:

```bash
# Watch backend logs
npm run dev

# Look for webhook logs:
# [webhook] {"timestamp":"...","source":"webhook","eventType":"payment.failed",...}
```

## Monitoring

### Key Metrics to Track

- **Verification failures:** `verification-failed` events
- **Duplicate deliveries:** `duplicate` events
- **Handler errors:** `handler-failed` events
- **Processing time:** `durationMs` field in logs
- **Unknown events:** `unknown-event` events

### Log Queries

```bash
# Count payment failures
grep '"eventType":"payment.failed"' backend.log | wc -l

# Find verification failures
grep '"eventType":"verification-failed"' backend.log

# Check processing times
grep '"eventType":"processed"' backend.log | jq '.durationMs'
```

## Production Checklist

Before deploying to production:

- [ ] Replace in-memory idempotency store with database (PostgreSQL, Redis)
- [ ] Add database migration for `webhook_events` table
- [ ] Implement real notification system (Resend, SendGrid, etc.)
- [ ] Add queue integration for throttling (BullMQ, Inngest, etc.)
- [ ] Set up monitoring/alerting for webhook failures
- [ ] Configure separate test/live webhook secrets
- [ ] Add rate limiting to webhook endpoint
- [ ] Set up log aggregation (DataDog, CloudWatch, etc.)
- [ ] Test replay attack prevention (expired timestamp handling)
- [ ] Document incident response for webhook outages

## Database Migration (Future)

When adding a database, create this migration:

```sql
-- Idempotency tracking
CREATE TABLE webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  customer_external_id TEXT,
  payload JSONB
);

-- Index for cleanup queries
CREATE INDEX idx_webhook_events_processed_at 
  ON webhook_events(processed_at);

-- Billing status tracking
ALTER TABLE users 
  ADD COLUMN billing_status TEXT DEFAULT 'active',
  ADD COLUMN billing_status_updated_at TIMESTAMP;

-- Index for at-risk queries
CREATE INDEX idx_users_billing_status 
  ON users(billing_status) 
  WHERE billing_status != 'active';
```

Then update `backend/src/webhooks/idempotency/` to use database instead of memory.

## Troubleshooting

### Webhook returns 400 (verification failed)

- Check that `FLOWGLAD_WEBHOOK_SECRET` matches the dashboard
- Ensure secret includes `whsec_` prefix
- Verify raw body is preserved (express.raw middleware)
- Check timestamp is current (within 5 minutes)

### Webhook not received

- Confirm webhook URL is publicly accessible
- Check Flowglad dashboard for delivery attempts
- Verify endpoint is mounted at `/api/webhook`
- Check firewall/security group rules

### Duplicate processing

- Idempotency store may have been cleared (restart)
- Check `eventId` uniqueness in logs
- Verify deduplication logic is working

### Handler errors

- Check logs for `handler-failed` events
- Errors are logged but return 200 OK to prevent retries
- Fix handler logic and wait for next event delivery

## Support

For issues with:
- **Flowglad webhooks:** [docs.flowglad.com/features/webhooks](https://docs.flowglad.com/features/webhooks)
- **This implementation:** Check logs, run tests, review handler code

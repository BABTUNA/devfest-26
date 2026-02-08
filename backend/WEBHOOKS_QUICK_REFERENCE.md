# Flowglad Webhooks - Quick Reference

## 🚀 Quick Start

### 1. Add Environment Variables
```bash
# backend/.env
FLOWGLAD_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
FLOWGLAD_WEBHOOK_MODE=test
```

### 2. Configure Flowglad Dashboard
1. Go to https://app.flowglad.com/settings
2. Navigate to API → Webhooks → Create Webhook
3. URL: `https://yourdomain.com/api/webhook`
4. Select events: `payment.failed`
5. Copy secret to `.env`

### 3. Start Server
```bash
npm run dev
```

## 📡 Webhook Endpoint

**URL:** `POST /api/webhook`  
**Headers:**
- `svix-id` - Unique message ID
- `svix-timestamp` - Unix timestamp
- `svix-signature` - HMAC signature (v1,base64)

**Response:**
- `200 OK` - Event processed successfully
- `400 Bad Request` - Signature verification failed
- `500 Internal Server Error` - Handler error

## 🎯 Supported Events

| Event Type | Status | Handler |
|------------|--------|---------|
| `payment.failed` | ✅ Implemented | `handlers/paymentFailed.ts` |
| `payment.succeeded` | ⚪ No handler | - |
| `subscription.created` | ⚪ No handler | - |
| `subscription.updated` | ⚪ No handler | - |
| `subscription.canceled` | ⚪ No handler | - |
| `customer.created` | ⚪ No handler | - |
| `customer.updated` | ⚪ No handler | - |
| `purchase.completed` | ⚪ No handler | - |

## 📝 Adding New Handlers

### Step 1: Define Event Type
```typescript
// backend/src/webhooks/types.ts
export interface YourEvent extends WebhookEvent {
  type: 'your.event';
  object: 'your_object';
  customer: CustomerInfo;
}

// Add to union
export type FlowgladWebhookEvent = ... | YourEvent;
```

### Step 2: Create Handler
```typescript
// backend/src/webhooks/handlers/yourHandler.ts
import { YourEvent } from '../types.js';
import { logWebhook } from '../logging.js';

export async function handleYourEvent(event: YourEvent): Promise<void> {
  logWebhook('your.event.handled', event.id, {
    customerId: event.customer.id,
  });
  
  // Your business logic here
}
```

### Step 3: Register Handler
```typescript
// backend/src/webhooks/handlers/index.ts
import { handleYourEvent } from './yourHandler.js';

export const handlers: WebhookHandlerRegistry = {
  'payment.failed': handlePaymentFailed as WebhookHandler,
  'your.event': handleYourEvent as WebhookHandler, // Add here
};
```

## 🧪 Testing

### Local Testing with ngrok
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start ngrok
ngrok http 4000

# Copy HTTPS URL and configure in Flowglad dashboard
# URL: https://abc123.ngrok.io/api/webhook
```

### Manual Testing with curl
```bash
curl -X POST http://localhost:4000/api/webhook \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test123" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,YOUR_SIGNATURE" \
  -d '{"id":"pay_test","type":"payment.failed","object":"payment","customer":{"id":"cust_1","externalId":"user-1"}}'
```

### Run Test Suite
```bash
cd backend/src/webhooks/tests
npx tsx index.ts
```

## 📊 Monitoring

### View Logs
```bash
# All webhook events
grep '"source":"webhook"' backend.log

# Payment failures only
grep '"eventType":"payment.failed"' backend.log

# Verification failures
grep '"eventType":"verification-failed"' backend.log

# Processing times
grep '"eventType":"processed"' backend.log | jq '.durationMs'
```

### Key Metrics
- `webhook.received.total` - Events received
- `webhook.processed.total` - Successfully processed
- `webhook.duplicate.total` - Duplicates caught
- `webhook.verification_failed.total` - Signature failures
- `webhook.processing_duration_ms` - Processing time

## 🔧 Troubleshooting

### Webhook returns 400
- ✅ Check `FLOWGLAD_WEBHOOK_SECRET` matches dashboard
- ✅ Ensure secret includes `whsec_` prefix
- ✅ Verify timestamp is within 5 minutes
- ✅ Confirm express.raw() middleware is active

### Webhook not received
- ✅ Verify URL is publicly accessible
- ✅ Check Flowglad dashboard delivery attempts
- ✅ Confirm endpoint mounted at `/api/webhook`
- ✅ Check firewall/security rules

### Duplicate processing
- ✅ Check idempotency store is working
- ✅ Verify eventId uniqueness in logs
- ✅ Note: In-memory store clears on restart

### Handler errors
- ✅ Check logs for `handler-failed` events
- ✅ Handlers return 200 OK even on error
- ✅ Fix logic and wait for next delivery

## 📁 File Locations

```
backend/src/webhooks/
├── index.ts              # Main handler
├── verify.ts             # Signature verification
├── router.ts             # Event dispatcher
├── handlers/
│   ├── paymentFailed.ts  # Payment failure handler
│   └── _template.ts      # Handler template
└── tests/                # Test suite
```

## 🔗 Documentation

- **Setup Guide:** `backend/WEBHOOKS.md`
- **Implementation Summary:** `backend/WEBHOOKS_IMPLEMENTATION_SUMMARY.md`
- **Flowglad Docs:** https://docs.flowglad.com/features/webhooks

## ⚡ Quick Commands

```bash
# Build
npm run build

# Run tests
cd backend/src/webhooks/tests && npx tsx index.ts

# View logs
tail -f backend.log | grep webhook

# Count events
grep '"source":"webhook"' backend.log | wc -l
```

## 🎯 Production Checklist

- [ ] Replace in-memory store with database
- [ ] Add database migration for webhook_events table
- [ ] Implement notification system
- [ ] Add queue integration for throttling
- [ ] Set up monitoring/alerting
- [ ] Configure separate test/live secrets
- [ ] Add rate limiting
- [ ] Set up log aggregation

---

**Need Help?** See `backend/WEBHOOKS.md` for detailed documentation.

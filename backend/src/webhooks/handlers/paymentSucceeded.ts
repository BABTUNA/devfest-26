import { PaymentSucceededEvent, PurchaseCompletedEvent } from '../types.js';
import { logWebhook } from '../logging.js';
import { upsertConfirmedWorkflowPurchase } from '../../services/purchases.js';

type PurchaseSuccessEvent = PaymentSucceededEvent | PurchaseCompletedEvent;

function getMetadataValue(metadata: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function getMetadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type PurchaseRecorder = typeof upsertConfirmedWorkflowPurchase;

export async function processPurchaseSuccessEvent(
  event: PurchaseSuccessEvent,
  recordPurchase: PurchaseRecorder = upsertConfirmedWorkflowPurchase
): Promise<'recorded' | 'skipped'> {
  const metadata = (event.metadata ?? {}) as Record<string, unknown>;

  const workflowId = getMetadataValue(metadata, ['workflowId', 'workflow_id']);
  const buyerUserId =
    getMetadataValue(metadata, ['buyerUserId', 'buyer_user_id']) ?? event.customer.externalId;
  const providerPaymentId =
    getMetadataValue(metadata, ['paymentId', 'payment_id', 'purchaseId', 'purchase_id']) ?? event.id;

  logWebhook('purchase.success.received', event.id, {
    eventType: event.type,
    customerId: event.customer.id,
    externalId: event.customer.externalId,
    workflowId,
    buyerUserId,
    providerPaymentId,
  });

  if (!workflowId) {
    // Keep webhook endpoint healthy; this event cannot grant access without workflow metadata.
    console.warn(`[webhook] ${event.type} missing workflowId metadata. eventId=${event.id}`);
    return 'skipped';
  }

  if (!buyerUserId) {
    console.warn(`[webhook] ${event.type} missing buyerUserId metadata. eventId=${event.id}`);
    return 'skipped';
  }

  await recordPurchase({
    buyerUserId,
    workflowId,
    provider: 'flowglad',
    providerPaymentId,
    providerEventId: event.id,
    amount: getMetadataNumber(metadata, 'amount'),
    currency: getMetadataValue(metadata, ['currency']),
    metadata,
  });

  logWebhook('purchase.success.recorded', event.id, {
    eventType: event.type,
    workflowId,
    buyerUserId,
    providerPaymentId,
  });
  return 'recorded';
}

export async function handlePaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
  await processPurchaseSuccessEvent(event);
}

export async function handlePurchaseCompleted(event: PurchaseCompletedEvent): Promise<void> {
  await processPurchaseSuccessEvent(event);
}

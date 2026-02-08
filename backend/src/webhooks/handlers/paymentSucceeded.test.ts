import test from 'node:test';
import assert from 'node:assert/strict';
import { processPurchaseSuccessEvent } from './paymentSucceeded.js';
import type { PaymentSucceededEvent } from '../types.js';

test('payment success webhook records confirmed purchase', async () => {
  const event: PaymentSucceededEvent = {
    id: 'evt_1',
    type: 'payment.succeeded',
    object: 'payment',
    customer: {
      id: 'customer_1',
      externalId: 'buyer-user',
    },
    metadata: {
      workflowId: 'workflow-123',
      buyerUserId: 'buyer-user',
      paymentId: 'payment-abc',
      amount: 500,
      currency: 'usd',
    },
  };

  let recordedPayload: unknown = null;
  const result = await processPurchaseSuccessEvent(event, async (payload) => {
    recordedPayload = payload;
  });

  assert.equal(result, 'recorded');
  assert.deepEqual(recordedPayload, {
    buyerUserId: 'buyer-user',
    workflowId: 'workflow-123',
    provider: 'flowglad',
    providerPaymentId: 'payment-abc',
    providerEventId: 'evt_1',
    amount: 500,
    currency: 'usd',
    metadata: event.metadata,
  });
});

test('payment success without workflow metadata is skipped', async () => {
  const event: PaymentSucceededEvent = {
    id: 'evt_2',
    type: 'payment.succeeded',
    object: 'payment',
    customer: {
      id: 'customer_2',
      externalId: 'buyer-user',
    },
    metadata: {
      buyerUserId: 'buyer-user',
    },
  };

  let called = false;
  const result = await processPurchaseSuccessEvent(event, async () => {
    called = true;
  });

  assert.equal(result, 'skipped');
  assert.equal(called, false);
});

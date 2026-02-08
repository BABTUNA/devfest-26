import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessWorkflow } from './purchases.js';

test('owner always has access even without purchase', () => {
  const allowed = canAccessWorkflow({
    workflowOwnerUserId: 'owner',
    requesterUserId: 'owner',
    hasPaidPurchase: false,
  });

  assert.equal(allowed, true);
});

test('non-owner with confirmed paid purchase has access', () => {
  const allowed = canAccessWorkflow({
    workflowOwnerUserId: 'owner',
    requesterUserId: 'buyer',
    hasPaidPurchase: true,
  });

  assert.equal(allowed, true);
});

test('non-owner without confirmed paid purchase is denied', () => {
  const allowed = canAccessWorkflow({
    workflowOwnerUserId: 'owner',
    requesterUserId: 'buyer',
    hasPaidPurchase: false,
  });

  assert.equal(allowed, false);
});

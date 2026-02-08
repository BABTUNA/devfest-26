import test from 'node:test';
import assert from 'node:assert/strict';
import type { Workflow } from '../lib/supabase.js';
import { evaluateWorkflowCheckoutGate } from './checkoutGating.js';

function buildWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    owner_user_id: 'owner-user',
    name: 'Test workflow',
    description: 'Workflow description',
    includes: [],
    definition: {},
    is_published: true,
    price_in_cents: 500,
    flowglad_product_id: 'product_123',
    flowglad_price_id: 'workflow_test_workflow',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

test('listed workflow with valid mapping is purchasable', () => {
  const result = evaluateWorkflowCheckoutGate({
    workflow: buildWorkflow(),
    buyerUserId: 'buyer-user',
    includedWorkflows: [],
  });

  assert.equal(result.allowed, true);
  if (result.allowed) {
    assert.equal(result.reason, 'workflow_checkout_allowed');
    assert.equal(result.mappedPriceSlug, 'workflow_test_workflow');
  }
});

test('unlisted workflow is rejected with clear reason', () => {
  const result = evaluateWorkflowCheckoutGate({
    workflow: buildWorkflow({ is_published: false }),
    buyerUserId: 'buyer-user',
    includedWorkflows: [],
  });

  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.status, 400);
    assert.equal(result.reason, 'workflow_not_listed');
    assert.match(result.error, /not listed for sale/i);
  }
});

test('listed workflow without valid Flowglad mapping is rejected', () => {
  const result = evaluateWorkflowCheckoutGate({
    workflow: buildWorkflow({ flowglad_price_id: null }),
    buyerUserId: 'buyer-user',
    includedWorkflows: [],
  });

  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.status, 400);
    assert.equal(result.reason, 'flowglad_price_mapping_missing');
    assert.match(result.error, /missing a valid flowglad price mapping/i);
  }
});

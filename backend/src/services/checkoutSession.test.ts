import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckoutSessionFromCandidates } from './checkoutSession.js';

test('creates checkout session for valid candidate mapping', async () => {
  const calls: string[] = [];

  const result = await createCheckoutSessionFromCandidates({
    client: {
      async createCheckoutSession(params) {
        calls.push(params.priceSlug);
        return {
          checkoutSession: {
            id: 'cs_1',
            url: 'https://checkout.flowglad.example/session/cs_1',
          },
        };
      },
    },
    candidates: ['workflow_valid_slug'],
    options: {
      successUrl: 'http://localhost:3000/success',
      cancelUrl: 'http://localhost:3000/cancel',
    },
  });

  assert.deepEqual(calls, ['workflow_valid_slug']);
  assert.equal(result.selectedPriceSlug, 'workflow_valid_slug');
  assert.equal(typeof result.result, 'object');
});

test('throws clear error when mapping candidates are all invalid', async () => {
  await assert.rejects(
    createCheckoutSessionFromCandidates({
      client: {
        async createCheckoutSession() {
          throw new Error('Price not found');
        },
      },
      candidates: ['workflow_bad_slug'],
      options: {
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      },
    }),
    /Unable to create checkout session\. Tried price slugs: workflow_bad_slug/i
  );
});

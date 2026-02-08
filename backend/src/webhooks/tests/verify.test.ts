/**
 * Tests for webhook signature verification
 * 
 * Run with: npm test (after adding test framework)
 */

import crypto from 'crypto';
import { verifyWebhook, WebhookVerificationError } from '../verify.js';

/**
 * Helper: Generate valid webhook signature
 */
function generateSignature(
  id: string,
  timestamp: string,
  body: string,
  secret: string
): string {
  const secretKey = Buffer.from(secret.split('_')[1], 'base64');
  const signedContent = `${id}.${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signedContent)
    .digest('base64');
  return `v1,${signature}`;
}

/**
 * Test suite for webhook verification
 */
export function runVerificationTests() {
  console.log('Running webhook verification tests...\n');
  
  const testSecret = 'whsec_MRjE+5F7FvgZc5J0XxYlH3qHGxKJ9FLQxIGYJ0k=';
  const testId = 'msg_test123';
  const testBody = JSON.stringify({ id: 'evt_123', type: 'test.event' });
  const currentTimestamp = Math.floor(Date.now() / 1000).toString();
  
  // Test 1: Valid signature
  try {
    const validSignature = generateSignature(testId, currentTimestamp, testBody, testSecret);
    const headers = {
      'svix-id': testId,
      'svix-timestamp': currentTimestamp,
      'svix-signature': validSignature,
    };
    
    const result = verifyWebhook(testBody, headers, testSecret);
    console.log('✅ Test 1 PASSED: Valid signature accepted');
  } catch (error) {
    console.error('❌ Test 1 FAILED: Valid signature rejected', error);
  }
  
  // Test 2: Invalid signature
  try {
    const headers = {
      'svix-id': testId,
      'svix-timestamp': currentTimestamp,
      'svix-signature': 'v1,invalid_signature',
    };
    
    verifyWebhook(testBody, headers, testSecret);
    console.error('❌ Test 2 FAILED: Invalid signature accepted');
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.log('✅ Test 2 PASSED: Invalid signature rejected');
    } else {
      console.error('❌ Test 2 FAILED: Wrong error type', error);
    }
  }
  
  // Test 3: Missing headers
  try {
    const headers = {
      'svix-id': testId,
      // Missing timestamp and signature
    };
    
    verifyWebhook(testBody, headers, testSecret);
    console.error('❌ Test 3 FAILED: Missing headers accepted');
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.log('✅ Test 3 PASSED: Missing headers rejected');
    } else {
      console.error('❌ Test 3 FAILED: Wrong error type', error);
    }
  }
  
  // Test 4: Expired timestamp (>5 minutes old)
  try {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
    const oldSignature = generateSignature(testId, oldTimestamp, testBody, testSecret);
    const headers = {
      'svix-id': testId,
      'svix-timestamp': oldTimestamp,
      'svix-signature': oldSignature,
    };
    
    verifyWebhook(testBody, headers, testSecret);
    console.error('❌ Test 4 FAILED: Expired timestamp accepted');
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.log('✅ Test 4 PASSED: Expired timestamp rejected');
    } else {
      console.error('❌ Test 4 FAILED: Wrong error type', error);
    }
  }
  
  // Test 5: Future timestamp (>60s in future)
  try {
    const futureTimestamp = (Math.floor(Date.now() / 1000) + 120).toString();
    const futureSignature = generateSignature(testId, futureTimestamp, testBody, testSecret);
    const headers = {
      'svix-id': testId,
      'svix-timestamp': futureTimestamp,
      'svix-signature': futureSignature,
    };
    
    verifyWebhook(testBody, headers, testSecret);
    console.error('❌ Test 5 FAILED: Future timestamp accepted');
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.log('✅ Test 5 PASSED: Future timestamp rejected');
    } else {
      console.error('❌ Test 5 FAILED: Wrong error type', error);
    }
  }
  
  // Test 6: Invalid secret format
  try {
    const headers = {
      'svix-id': testId,
      'svix-timestamp': currentTimestamp,
      'svix-signature': generateSignature(testId, currentTimestamp, testBody, testSecret),
    };
    
    verifyWebhook(testBody, headers, 'invalid_secret');
    console.error('❌ Test 6 FAILED: Invalid secret format accepted');
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.log('✅ Test 6 PASSED: Invalid secret format rejected');
    } else {
      console.error('❌ Test 6 FAILED: Wrong error type', error);
    }
  }
  
  console.log('\nVerification tests complete!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerificationTests();
}

/**
 * Tests for webhook event routing
 * 
 * Run with: npm test (after adding test framework)
 */

import { routeEvent } from '../router.js';
import { PaymentFailedEvent } from '../types.js';

/**
 * Test suite for webhook routing
 */
export async function runRouterTests() {
  console.log('Running webhook router tests...\n');
  
  // Test 1: Known event type (payment.failed)
  try {
    const event: PaymentFailedEvent = {
      id: 'pay_test123',
      type: 'payment.failed',
      object: 'payment',
      customer: {
        id: 'cust_abc123',
        externalId: 'test-user',
      },
      failureReason: 'card_declined',
    };
    
    await routeEvent(event);
    console.log('✅ Test 1 PASSED: payment.failed event routed successfully');
  } catch (error) {
    console.error('❌ Test 1 FAILED: payment.failed routing failed', error);
  }
  
  // Test 2: Unknown event type
  try {
    const event = {
      id: 'evt_unknown123',
      type: 'unknown.event',
      object: 'unknown',
    } as any;
    
    await routeEvent(event);
    console.log('✅ Test 2 PASSED: Unknown event handled gracefully');
  } catch (error) {
    console.error('❌ Test 2 FAILED: Unknown event threw error', error);
  }
  
  // Test 3: Event with missing customer field
  try {
    const event = {
      id: 'pay_test456',
      type: 'payment.failed',
      object: 'payment',
      customer: {
        id: '',
        externalId: '',
      },
    } as PaymentFailedEvent;
    
    await routeEvent(event);
    console.log('✅ Test 3 PASSED: Event with empty customer handled');
  } catch (error) {
    console.error('❌ Test 3 FAILED: Empty customer caused error', error);
  }
  
  console.log('\nRouter tests complete!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRouterTests();
}

/**
 * Run all webhook tests
 */

import { runVerificationTests } from './verify.test.js';
import { runRouterTests } from './router.test.js';

async function runAllTests() {
  console.log('========================================');
  console.log('    FLOWGLAD WEBHOOK TEST SUITE');
  console.log('========================================\n');
  
  // Run verification tests
  runVerificationTests();
  
  console.log('\n========================================\n');
  
  // Run router tests
  await runRouterTests();
  
  console.log('\n========================================');
  console.log('    ALL TESTS COMPLETE');
  console.log('========================================\n');
}

runAllTests().catch(console.error);

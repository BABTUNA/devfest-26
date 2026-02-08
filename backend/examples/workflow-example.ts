/**
 * Example workflow demonstrating the complete Supabase backend flow.
 * 
 * This script demonstrates:
 * 1. User signup with name
 * 2. User signin to get JWT
 * 3. Creating workflows
 * 4. Including workflows in other workflows
 * 5. Fetching user workflows
 * 6. Validation errors (cycles, wrong owner, non-existent workflows)
 * 
 * Usage:
 *   cd backend
 *   npx tsx examples/workflow-example.ts
 */

import 'dotenv/config';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';

// Helper to make API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${data.error || response.statusText}`);
  }

  return data;
}

async function main() {
  console.log('=== Supabase Backend Example ===\n');

  // Generate unique email for this test run
  const timestamp = Date.now();
  const email = `test${timestamp}@example.com`;
  const password = 'TestPassword123!';
  const name = 'Test User';

  console.log('1. Sign up new user...');
  try {
    const signupResult = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    console.log('✓ Signup successful');
    console.log('  User ID:', signupResult.user.id);
    console.log('  Email:', signupResult.user.email);
  } catch (error) {
    console.error('✗ Signup failed:', error);
    return;
  }

  console.log('\n2. Sign in...');
  let accessToken: string;
  let userId: string;
  try {
    const signinResult = await apiCall('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    accessToken = signinResult.session.access_token;
    userId = signinResult.user.id;
    console.log('✓ Sign in successful');
    console.log('  Access token:', accessToken.substring(0, 20) + '...');
  } catch (error) {
    console.error('✗ Sign in failed:', error);
    return;
  }

  // Helper for authenticated requests
  const authApiCall = (endpoint: string, options: RequestInit = {}) => {
    return apiCall(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  };

  console.log('\n3. Get user profile...');
  try {
    const profile = await authApiCall('/users/profile');
    console.log('✓ Profile fetched');
    console.log('  Name:', profile.name);
    console.log('  Created at:', profile.created_at);
  } catch (error) {
    console.error('✗ Profile fetch failed:', error);
  }

  console.log('\n4. Create workflow A...');
  let workflowA: any;
  try {
    workflowA = await authApiCall('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Workflow A',
        description: 'First workflow',
        definition: { blocks: ['block1', 'block2'] },
      }),
    });
    console.log('✓ Workflow A created');
    console.log('  ID:', workflowA.id);
    console.log('  Name:', workflowA.name);
  } catch (error) {
    console.error('✗ Workflow A creation failed:', error);
    return;
  }

  console.log('\n5. Create workflow B...');
  let workflowB: any;
  try {
    workflowB = await authApiCall('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Workflow B',
        description: 'Second workflow',
        definition: { blocks: ['block3', 'block4'] },
      }),
    });
    console.log('✓ Workflow B created');
    console.log('  ID:', workflowB.id);
    console.log('  Name:', workflowB.name);
  } catch (error) {
    console.error('✗ Workflow B creation failed:', error);
    return;
  }

  console.log('\n6. Create workflow C that includes A and B...');
  let workflowC: any;
  try {
    workflowC = await authApiCall('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Workflow C',
        description: 'Composite workflow',
        definition: { blocks: ['block5'] },
      }),
    });
    console.log('✓ Workflow C created');
    console.log('  ID:', workflowC.id);

    // Now update it to include A and B
    const updated = await authApiCall(`/workflows/${workflowC.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        includes: [workflowA.id, workflowB.id],
      }),
    });
    console.log('✓ Workflow C updated with includes');
    console.log('  Includes:', updated.includes);
  } catch (error) {
    console.error('✗ Workflow C creation/update failed:', error);
    return;
  }

  console.log('\n7. Fetch all user workflows...');
  try {
    const workflows = await authApiCall('/workflows');
    console.log('✓ Workflows fetched');
    console.log(`  Total workflows: ${workflows.length}`);
    workflows.forEach((w: any) => {
      console.log(`  - ${w.name} (includes ${w.includes.length} workflows)`);
    });
  } catch (error) {
    console.error('✗ Workflows fetch failed:', error);
  }

  console.log('\n8. Test validation: Try to create circular dependency...');
  try {
    // Try to make A include C (which includes A) -> creates a cycle
    await authApiCall(`/workflows/${workflowA.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        includes: [workflowC.id],
      }),
    });
    console.log('✗ Cycle detection failed - should have thrown error!');
  } catch (error) {
    console.log('✓ Cycle detection working');
    console.log('  Error:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n9. Test validation: Try to include non-existent workflow...');
  try {
    await authApiCall(`/workflows/${workflowA.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        includes: ['00000000-0000-0000-0000-000000000000'],
      }),
    });
    console.log('✗ Non-existent workflow validation failed!');
  } catch (error) {
    console.log('✓ Non-existent workflow validation working');
    console.log('  Error:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n10. Test validation: Try to include self...');
  try {
    await authApiCall(`/workflows/${workflowA.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        includes: [workflowA.id],
      }),
    });
    console.log('✗ Self-reference validation failed!');
  } catch (error) {
    console.log('✓ Self-reference validation working');
    console.log('  Error:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n11. Update user profile...');
  try {
    const updated = await authApiCall('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Test User',
      }),
    });
    console.log('✓ Profile updated');
    console.log('  New name:', updated.name);
  } catch (error) {
    console.error('✗ Profile update failed:', error);
  }

  console.log('\n12. Delete workflow B...');
  try {
    await authApiCall(`/workflows/${workflowB.id}`, {
      method: 'DELETE',
    });
    console.log('✓ Workflow B deleted');
  } catch (error) {
    console.error('✗ Workflow deletion failed:', error);
  }

  console.log('\n13. Verify final workflow list...');
  try {
    const workflows = await authApiCall('/workflows');
    console.log('✓ Final workflows:');
    workflows.forEach((w: any) => {
      console.log(`  - ${w.name}`);
    });
  } catch (error) {
    console.error('✗ Workflows fetch failed:', error);
  }

  console.log('\n=== Example completed successfully! ===');
}

main().catch((error) => {
  console.error('\n=== Fatal error ===');
  console.error(error);
  process.exit(1);
});

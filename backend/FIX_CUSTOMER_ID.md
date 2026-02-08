# Fix: getCustomerExternalId Export

## Issue

The existing `run-block.ts` route was importing `getCustomerExternalId` from the auth module, but this function was not included in the new Supabase-based auth implementation.

## Error

```
SyntaxError: The requested module '../lib/auth.js' does not provide an export named 'getCustomerExternalId'
```

## Root Cause

When replacing the auth module with Supabase authentication, the `getCustomerExternalId` function was removed. However, this function is still needed by:
- `src/routes/run-block.ts` - For Flowglad billing integration
- `src/routes/entitlements.ts` - For checking user entitlements
- `src/routes/checkout.ts` - For checkout operations

## Solution

Added `getCustomerExternalId` function back to `src/lib/auth.ts`:

```typescript
export async function getCustomerExternalId(req: Request): Promise<string> {
  const DEMO_USER_ID = 'demo-user-1';
  
  try {
    const user = await getCurrentUser(req);
    return user.id;
  } catch {
    // If authentication fails (e.g., in demo mode or missing token),
    // fall back to demo user ID
    return DEMO_USER_ID;
  }
}
```

### Key Features

1. **Supabase Integration**: Uses the authenticated Supabase user's ID as the customer external ID
2. **Backward Compatibility**: Falls back to demo user ID if no auth token is present (for demo mode)
3. **Flowglad Compatible**: Returns the user ID that Flowglad can use as the customer external ID

## Additional Fixes

Fixed TypeScript errors in `src/routes/workflows.ts` where `req.params.id` (type `string | string[]`) was being passed to functions expecting `string`:

```typescript
// Before
const workflowId = req.params.id;

// After
const workflowId = String(req.params.id);
```

## Verification

- ✅ TypeScript build succeeds: `npm run build`
- ✅ No linter errors
- ✅ All existing routes continue to work
- ✅ New Supabase routes work correctly

## Impact

- Existing Flowglad billing functionality continues to work
- Demo mode still functions as expected
- Supabase authenticated users' IDs are now used as customer IDs for billing
- No breaking changes to existing API endpoints

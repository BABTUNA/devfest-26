# Frontend Auth Status

## Current state

Frontend authentication now uses real Supabase user sessions.

### Implemented

1. Supabase session-based auth in frontend
- `frontend/src/lib/auth.ts` now exposes:
  - `getSession`
  - `getAccessToken`
  - `signInWithPassword`
  - `signUpWithPassword`
  - `signOut`
  - `refreshAccessToken`

2. Auth provider with user state and auth actions
- `frontend/src/contexts/AuthContext.tsx` now provides:
  - `ready`
  - `user`
  - `isAuthenticated`
  - `signIn`
  - `signUp`
  - `signOut`
  - `refreshSession`

3. Login and signup pages
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`

4. Protected routes in frontend UI
- Guard component: `frontend/src/components/RequireAuth.tsx`
- Protected pages:
  - `frontend/src/app/marketplace/page.tsx`
  - `frontend/src/app/lab/page.tsx`
  - `frontend/src/app/cart/page.tsx`
  - `frontend/src/app/profile/page.tsx`

5. API auth retry behavior
- `frontend/src/lib/api.ts` uses `Authorization: Bearer <token>`
- On `401`, it tries `refreshAccessToken()` once, then retries.

6. UI wired to authenticated user
- `frontend/src/components/AppHeader.tsx`
  - shows real user identity
  - includes sign in/up state
  - includes sign out action
- `frontend/src/contexts/AppBillingContext.tsx`
  - binds customer identity to authenticated Supabase user
  - avoids billing fallback unlock for unauthenticated users

7. Environment cleanup
- Removed `NEXT_PUBLIC_DEV_AUTH_EMAIL` and `NEXT_PUBLIC_DEV_AUTH_PASSWORD` from:
  - `frontend/.env.example`
  - `frontend/.env.local`

## Expected auth flow

1. User opens `/login` or `/signup`
2. Supabase creates/restores session in browser
3. Frontend gets access token from Supabase session
4. Frontend calls backend with `Authorization: Bearer <jwt>`
5. Backend validates JWT and resolves user identity
6. Entitlements and billing data are loaded for that user

## Required env vars

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_DEMO_MODE` (optional)

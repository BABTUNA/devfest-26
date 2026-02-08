# Supabase Backend Setup Guide

Complete step-by-step guide to set up and run the Supabase-based backend.

## Overview

This backend provides:
- ✅ Email/password authentication via Supabase Auth
- ✅ User profile management
- ✅ Workflow CRUD operations
- ✅ Workflow includes with cycle detection
- ✅ Row Level Security (RLS)
- ✅ Full TypeScript support

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)
- Basic understanding of SQL and REST APIs

## Step-by-Step Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization and region
4. Set a strong database password (save it!)
5. Wait for project to initialize (~2 minutes)

### Step 2: Get API Credentials

1. In your Supabase dashboard, go to **Project Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service role key** (under "Project API keys" → `service_role`)

⚠️ **Important**: The service role key bypasses RLS. Keep it secret!

### Step 3: Configure Environment

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and update:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   ```

### Step 4: Install Dependencies

```bash
npm install
```

This installs:
- `@supabase/supabase-js` - Supabase client
- `express` - Web framework
- `typescript` - Type checking
- And other dependencies

### Step 5: Run Database Migrations

1. Open your Supabase dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**

#### Migration 1: Create Users Table

1. Open `db/migrations/001_create_users_table.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Verify: You should see "Success. No rows returned"

This creates:
- `public.users` table
- RLS policies for user profiles
- Trigger to auto-create profiles on signup

#### Migration 2: Create Workflows Table

1. Open `db/migrations/002_create_workflows_table.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. Verify: You should see "Success. No rows returned"

This creates:
- `public.workflows` table
- RLS policies for workflows
- Trigger for auto-updating timestamps

#### Verify Migrations

Run this query in SQL Editor to verify:

```sql
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'workflows');
```

Expected output:
```
tablename  | rls_enabled
-----------+------------
users      | true
workflows  | true
```

### Step 6: Start the Backend

```bash
npm run dev
```

You should see:
```
=== Backend Configuration ===
DEMO_MODE: false
SUPABASE_URL set: true
SUPABASE_SERVICE_ROLE_KEY set: true
============================
Backend running at http://localhost:4000
```

### Step 7: Test the API

Run the example script:

```bash
npx tsx examples/workflow-example.ts
```

Expected output:
```
=== Supabase Backend Example ===

1. Sign up new user...
✓ Signup successful
  User ID: ...
  Email: test...@example.com

2. Sign in...
✓ Sign in successful
  Access token: ...

3. Get user profile...
✓ Profile fetched
  Name: Test User
  ...

[continues through all test cases]

=== Example completed successfully! ===
```

## Quick API Test

### 1. Sign Up

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

Save the `access_token` from the response.

### 2. Create a Workflow

```bash
curl -X POST http://localhost:4000/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My First Workflow",
    "description": "Testing the API"
  }'
```

### 3. List Workflows

```bash
curl http://localhost:4000/api/workflows \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Verify in Supabase Dashboard

### Check Auth Users

1. Go to **Authentication** → **Users** in Supabase dashboard
2. You should see your test user

### Check Database Tables

1. Go to **Table Editor**
2. Select `users` table - should show your profile
3. Select `workflows` table - should show your workflows

### Check RLS Policies

1. Go to **Authentication** → **Policies**
2. Select `users` or `workflows` table
3. Verify policies are enabled and correctly configured

## Architecture

```
┌─────────────┐
│   Client    │
│  (cURL/App) │
└──────┬──────┘
       │ HTTP + JWT
       ▼
┌─────────────────────────────────────┐
│         Express Backend             │
│  ┌───────────────────────────────┐ │
│  │  Auth Middleware              │ │
│  │  - Validates JWT              │ │
│  │  - Extracts user ID           │ │
│  └──────────┬────────────────────┘ │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │  Services Layer              │  │
│  │  - users.ts                  │  │
│  │  - workflows.ts              │  │
│  │  - Validation + Cycle Check  │  │
│  └──────────┬───────────────────┘  │
└─────────────┼───────────────────────┘
              │ Supabase Client
              ▼
┌─────────────────────────────────────┐
│         Supabase Cloud              │
│  ┌─────────────────────────────┐   │
│  │  PostgreSQL Database        │   │
│  │  - auth.users               │   │
│  │  - public.users             │   │
│  │  - public.workflows         │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  Row Level Security (RLS)   │   │
│  │  - Per-user data isolation  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Common Issues

### ❌ "Missing SUPABASE_URL" warning
**Fix**: Make sure `.env` file exists and has correct credentials

### ❌ "Invalid or expired token"
**Fix**: Sign in again to get a fresh JWT token

### ❌ "relation 'public.users' does not exist"
**Fix**: Run the database migrations in Supabase SQL Editor

### ❌ "RLS policy violation"
**Fix**: Make sure you're passing the JWT token in Authorization header

### ❌ "Circular dependency detected"
**Fix**: Review your workflow includes - you're creating a cycle (A→B→A)

### ❌ Port 4000 already in use
**Fix**: Either:
- Kill the process using port 4000: `lsof -ti:4000 | xargs kill -9`
- Or change PORT in `.env` to a different port

## Next Steps

1. **Frontend Integration**: Use the access token from signin in your frontend
2. **Add More Features**: Extend the workflow definition JSONB field
3. **Deploy**: Deploy to a hosting service (Railway, Render, Fly.io)
4. **Production**: Use Supabase production keys and secure your environment

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Backend README](./SUPABASE_README.md) - Full API documentation

## Support

If you encounter issues:

1. Check the console logs - errors are descriptive
2. Verify environment variables are set correctly
3. Ensure migrations ran successfully in Supabase
4. Check RLS policies in Supabase dashboard
5. Test with the example script first before custom code

---

**You're all set!** 🚀

The backend is now running with Supabase authentication and database. You can start building your application on top of this foundation.

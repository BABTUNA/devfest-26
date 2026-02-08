# Fix: Database Schema Missing Columns

## Problem
The application is throwing errors:
- `column workflows.flowglad_price_id does not exist`
- `column workflows.is_published does not exist`

## Root Cause
Database migrations have not been applied to your Supabase database.

## Solutions

### Option 1: Apply All Migrations (Recommended) ✅

**Steps:**
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Open the file: `backend/db/APPLY_ALL_MIGRATIONS.sql`
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)

This will create all necessary tables and columns:
- `public.users` table
- `public.workflows` table with commerce columns
- `public.purchases` table for tracking purchases
- `public.flowglad_webhook_events` table

**Time:** ~30 seconds

---

### Option 2: Temporary Fix (Quick) 🔧

**Already Applied!** I've modified the code to work without these columns temporarily:
- Removed `flowglad_price_id` filtering from `listWorkflows()`
- Removed `is_published` filtering

**Status:** Your app should work now, but with limited functionality.

**Limitations:**
- Cannot filter marketplace by published workflows
- Cannot filter by Flowglad price mapping
- Commerce features won't work fully

**To restore full functionality:** Apply migrations (Option 1)

---

## Verify Migrations Were Applied

After running the migration, verify in Supabase:

1. Go to **Table Editor**
2. Select `workflows` table
3. Check that these columns exist:
   - ✅ `is_published` (boolean)
   - ✅ `price_in_cents` (integer)
   - ✅ `flowglad_product_id` (text)
   - ✅ `flowglad_price_id` (text)

4. Check that these tables exist:
   - ✅ `purchases`
   - ✅ `flowglad_webhook_events`

---

## What Each Migration Does

### Migration 001: Users Table
- Links to Supabase auth
- Stores user profiles
- Auto-creates profile on signup

### Migration 002: Workflows Table
- Stores workflow definitions
- Supports workflow composition (includes)
- Owner-based access control

### Migration 003: Commerce & Webhooks
- Adds commerce fields to workflows
- Creates purchases tracking table
- Creates webhook idempotency table
- Enables Flowglad integration

---

## Troubleshooting

### "Migration failed" errors
- Check Supabase logs in dashboard
- Ensure you're using the Service Role key (not anon key)
- Try running migrations one at a time

### "Relation already exists" errors
- Safe to ignore - migration uses `IF NOT EXISTS`
- Means some tables already created

### Column still missing after migration
- Refresh Supabase dashboard
- Check correct database is selected
- Verify migration completed without errors

---

## Current Status

✅ Code updated to work without migrations (temporary)
✅ Migration file created: `backend/db/APPLY_ALL_MIGRATIONS.sql`
⚠️ Full functionality requires running migrations

**Next Step:** Apply migrations using Option 1 above

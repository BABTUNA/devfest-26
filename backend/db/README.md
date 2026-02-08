# Database Migrations

This directory contains SQL migration files for setting up the Supabase database schema.

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Get your project URL and service role key from Project Settings > API
3. Update `backend/.env` with your credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Running Migrations

Execute these migrations in order through the Supabase SQL Editor (Dashboard > SQL Editor):

### 1. Create Users Table (001_create_users_table.sql)

This migration:
- Creates `public.users` table for user profiles
- Links to `auth.users` via foreign key
- Enables Row Level Security (RLS)
- Adds policies for users to read/update their own profile
- Creates trigger to auto-populate profile on signup

**To run:** Copy and paste the contents of `001_create_users_table.sql` into the SQL Editor and execute.

### 2. Create Workflows Table (002_create_workflows_table.sql)

This migration:
- Creates `public.workflows` table for workflow management
- Supports workflow includes via `uuid[]` array
- Enables RLS with owner-only access
- Adds trigger for auto-updating `updated_at` timestamp

**To run:** Copy and paste the contents of `002_create_workflows_table.sql` into the SQL Editor and execute.

## Schema Overview

### public.users

| Column     | Type         | Description                           |
|------------|--------------|---------------------------------------|
| id         | uuid         | Primary key, references auth.users.id |
| name       | text         | User's display name                   |
| created_at | timestamptz  | Account creation timestamp            |

**RLS Policies:**
- Users can SELECT their own row
- Users can UPDATE their own row

### public.workflows

| Column         | Type         | Description                              |
|----------------|--------------|------------------------------------------|
| id             | uuid         | Primary key (auto-generated)             |
| owner_user_id  | uuid         | References auth.users.id                 |
| name           | text         | Workflow name                            |
| description    | text         | Optional workflow description            |
| includes       | uuid[]       | Array of included workflow IDs           |
| definition     | jsonb        | Workflow graph/block data                |
| created_at     | timestamptz  | Creation timestamp                       |
| updated_at     | timestamptz  | Last update timestamp (auto-updated)     |

**RLS Policies:**
- Users can SELECT their own workflows
- Users can INSERT workflows with their user ID
- Users can UPDATE their own workflows
- Users can DELETE their own workflows

## Verification

After running migrations, verify the setup:

1. Check tables exist:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'workflows');
   ```

2. Check RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('users', 'workflows');
   ```

3. Check triggers exist:
   ```sql
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_schema = 'public';
   ```

## Testing

After migrations are complete:

1. Install dependencies: `npm install` in the backend directory
2. Start the backend: `npm run dev`
3. Run the example script: `npx tsx examples/workflow-example.ts`

The example script will:
- Sign up a test user
- Create workflows with includes
- Test validation (cycles, non-existent workflows)
- Demonstrate the full API

## Rollback

To remove the tables and start over:

```sql
-- Drop tables (cascades will remove triggers and policies)
DROP TABLE IF EXISTS public.workflows CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
```

## Notes

- The trigger `on_auth_user_created` automatically creates a profile in `public.users` when a new user signs up via Supabase Auth
- User metadata (name) passed during signup is extracted and stored in the profile
- RLS policies ensure users can only access their own data
- The `includes` array in workflows is validated by backend logic before saving
- Circular dependencies are prevented via DFS cycle detection in the backend

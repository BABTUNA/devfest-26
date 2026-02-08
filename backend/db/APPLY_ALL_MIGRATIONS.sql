-- ============================================================================
-- APPLY ALL MIGRATIONS
-- ============================================================================
-- Run this entire file in Supabase SQL Editor to set up the complete schema
-- This combines migrations 001, 002, and 003
-- ============================================================================

-- ============================================================================
-- MIGRATION 001: Create Users Table
-- ============================================================================

-- Create public.users table for user profiles
-- Links to auth.users table for authentication
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MIGRATION 002: Create Workflows Table
-- ============================================================================

-- Create public.workflows table for workflow management
-- Workflows can include other workflows via the includes array
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  includes uuid[] NOT NULL DEFAULT '{}'::uuid[],
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_owner_user_id ON public.workflows(owner_user_id);

-- Enable Row Level Security
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own workflows
DROP POLICY IF EXISTS "Users can view own workflows" ON public.workflows;
CREATE POLICY "Users can view own workflows"
  ON public.workflows
  FOR SELECT
  USING (auth.uid() = owner_user_id);

-- Policy: Users can insert their own workflows
DROP POLICY IF EXISTS "Users can insert own workflows" ON public.workflows;
CREATE POLICY "Users can insert own workflows"
  ON public.workflows
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

-- Policy: Users can update their own workflows
DROP POLICY IF EXISTS "Users can update own workflows" ON public.workflows;
CREATE POLICY "Users can update own workflows"
  ON public.workflows
  FOR UPDATE
  USING (auth.uid() = owner_user_id);

-- Policy: Users can delete their own workflows
DROP POLICY IF EXISTS "Users can delete own workflows" ON public.workflows;
CREATE POLICY "Users can delete own workflows"
  ON public.workflows
  FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on workflows table
DROP TRIGGER IF EXISTS on_workflow_updated ON public.workflows;
CREATE TRIGGER on_workflow_updated
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- MIGRATION 003: Add Workflow Commerce and Webhook Idempotency
-- ============================================================================

-- Add workflow commerce metadata fields
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_in_cents integer,
  ADD COLUMN IF NOT EXISTS flowglad_product_id text,
  ADD COLUMN IF NOT EXISTS flowglad_price_id text;

CREATE INDEX IF NOT EXISTS idx_workflows_is_published ON public.workflows(is_published);

-- Purchases represent confirmed entitlement state from Flowglad webhooks
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  provider text NOT NULL DEFAULT 'flowglad',
  provider_payment_id text,
  provider_event_id text,
  amount integer,
  currency text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_buyer_workflow_unique
  ON public.purchases (buyer_user_id, workflow_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_provider_payment_unique
  ON public.purchases (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_provider_event_unique
  ON public.purchases (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_user_id ON public.purchases (buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_workflow_id ON public.purchases (workflow_id);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
CREATE POLICY "Users can view own purchases"
  ON public.purchases
  FOR SELECT
  USING (auth.uid() = buyer_user_id);

DROP TRIGGER IF EXISTS on_purchase_updated ON public.purchases;
CREATE TRIGGER on_purchase_updated
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Durable webhook event idempotency tracking
CREATE TABLE IF NOT EXISTS public.flowglad_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  provider text NOT NULL DEFAULT 'flowglad',
  processed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_flowglad_webhook_events_processed_at
  ON public.flowglad_webhook_events(processed_at);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables, policies, and triggers have been created
-- Your database is now ready for the application
-- ============================================================================

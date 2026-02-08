-- Create public.workflows table for workflow management
-- Workflows can include other workflows via the includes array

CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  includes uuid[] DEFAULT '{}' NOT NULL,
  definition jsonb DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for faster queries by owner
CREATE INDEX IF NOT EXISTS idx_workflows_owner_user_id ON public.workflows(owner_user_id);

-- Enable Row Level Security
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own workflows
CREATE POLICY "Users can view own workflows"
  ON public.workflows
  FOR SELECT
  USING (auth.uid() = owner_user_id);

-- Policy: Users can insert their own workflows
CREATE POLICY "Users can insert own workflows"
  ON public.workflows
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

-- Policy: Users can update their own workflows
CREATE POLICY "Users can update own workflows"
  ON public.workflows
  FOR UPDATE
  USING (auth.uid() = owner_user_id);

-- Policy: Users can delete their own workflows
CREATE POLICY "Users can delete own workflows"
  ON public.workflows
  FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Trigger: Update updated_at on workflows table
DROP TRIGGER IF EXISTS on_workflow_updated ON public.workflows;
CREATE TRIGGER on_workflow_updated
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

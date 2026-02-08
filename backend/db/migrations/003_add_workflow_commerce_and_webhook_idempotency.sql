-- Add workflow commerce metadata and webhook-backed purchase state

-- Workflow listing + Flowglad mapping fields (safe if columns already exist)
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
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_flowglad_webhook_events_processed_at
  ON public.flowglad_webhook_events (processed_at DESC);

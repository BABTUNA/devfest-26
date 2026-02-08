'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { RequireAuth } from '@/components/RequireAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { checkExistingPurchase } from '@/lib/purchases/createPurchase';
import { listWorkflows } from '@/features/workflows/workflows.api';

type MarketplaceWorkflowCard = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
};

function WorkflowMarketplaceContent() {
  const [workflows, setWorkflows] = useState<MarketplaceWorkflowCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [purchasedWorkflowIds, setPurchasedWorkflowIds] = useState<Set<string>>(new Set());
  const [purchasingWorkflowId, setPurchasingWorkflowId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadWorkflows = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();

        const result = await listWorkflows({ limit: 50 });
        const data = result.workflows;

        if (!active) return;

        setWorkflows((data ?? []) as MarketplaceWorkflowCard[]);

        // Check which workflows the user has already purchased
        const { data: { user } } = await supabase.auth.getUser();
        if (active) {
          setCurrentUserId(user?.id ?? null);
        }
        if (user && data) {
          const purchased = new Set<string>();
          await Promise.all(
            data.map(async (workflow) => {
              const existingPurchase = await checkExistingPurchase(user.id, workflow.id);
              if (existingPurchase) {
                purchased.add(workflow.id);
              }
            })
          );
          if (active) {
            setPurchasedWorkflowIds(purchased);
          }
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load marketplace workflows');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    void loadWorkflows();

    return () => {
      active = false;
    };
  }, []);

  const handlePurchase = useCallback(async (workflow: MarketplaceWorkflowCard) => {
    setPurchaseError(null);
    setPurchasingWorkflowId(workflow.id);

    try {
      const supabase = getSupabaseClient();

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Please sign in to purchase workflows');
      }

      // Check if already purchased
      const existingPurchase = await checkExistingPurchase(user.id, workflow.id);
      if (existingPurchase && existingPurchase.status === 'paid') {
        throw new Error('You have already purchased this workflow');
      }

      if (workflow.owner_user_id === user.id) {
        throw new Error('Owners cannot purchase their own workflow.');
      }

      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to continue');
      }

      // Call checkout API
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workflowId: workflow.id,
          successUrl: `${window.location.origin}/marketplace?success=true&workflowId=${workflow.id}`,
          cancelUrl: `${window.location.origin}/marketplace?canceled=true`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to initiate checkout');
      }

      const { checkoutSession } = await res.json();

      if (checkoutSession?.url) {
        // Redirect to Flowglad Checkout
        window.location.href = checkoutSession.url;
      } else {
        throw new Error('Invalid checkout session response');
      }

    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Failed to start purchase');
      setPurchasingWorkflowId(null);
    }
  }, []);

  return (
    <RequireAuth>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-2xl border border-app bg-app-surface/75 p-4 md:p-5">
          <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Marketplace</h1>
          <p className="mt-1 text-sm text-app-soft">Explore available workflows.</p>
        </section>

        {purchaseError && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
            {purchaseError}
          </div>
        )}

        <section className="rounded-2xl border border-app bg-app-surface/70 p-4">
          {loading ? (
            <div className="rounded-xl border border-app bg-app-surface p-6 text-sm text-app-soft">Loading workflows…</div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-6 text-sm text-rose-300">{error}</div>
          ) : workflows.length === 0 ? (
            <div className="rounded-xl border border-app bg-app-surface p-6 text-sm text-app-soft">No workflows available.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {workflows.map((workflow) => {
                const isPurchased = purchasedWorkflowIds.has(workflow.id);
                const isOwner = currentUserId === workflow.owner_user_id;
                const isPurchasing = purchasingWorkflowId === workflow.id;

                return (
                  <article key={workflow.id} className="rounded-xl border border-app bg-app-card/80 p-4">
                    <h2 className="text-base font-semibold text-app-fg">{workflow.name}</h2>
                    <p
                      className="mt-2 text-sm text-app-soft"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {workflow.description?.trim() || 'No description provided.'}
                    </p>

                    <div className="mt-4">
                      {isPurchased || isOwner ? (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-500/35 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          {isOwner ? 'Owned' : 'Purchased'}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handlePurchase(workflow)}
                          disabled={isPurchasing}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPurchasing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Purchasing…
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-4 w-4" />
                              Purchase Agent
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </RequireAuth>
  );
}

export default function MarketplacePage() {
  return <WorkflowMarketplaceContent />;
}

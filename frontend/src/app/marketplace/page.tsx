'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { RequireAuth } from '@/components/RequireAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { createPurchase, checkExistingPurchase } from '@/lib/purchases/createPurchase';

type MarketplaceWorkflowCard = {
  id: string;
  name: string;
  description: string | null;
};

function WorkflowMarketplaceContent() {
  const [workflows, setWorkflows] = useState<MarketplaceWorkflowCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

        // Load workflows
        const { data, error: queryError } = await supabase
          .from('workflows')
          .select('id, name, description')
          .order('updated_at', { ascending: false });

        if (!active) return;

        if (queryError) {
          throw new Error(queryError.message);
        }

        setWorkflows((data ?? []) as MarketplaceWorkflowCard[]);

        // Check which workflows the user has already purchased
        const { data: { user } } = await supabase.auth.getUser();
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

      // Check if already purchased or has pending purchase
      const existingPurchase = await checkExistingPurchase(user.id, workflow.id);
      if (existingPurchase) {
        if (existingPurchase.status === 'paid') {
          throw new Error('You have already purchased this workflow');
        } else {
          throw new Error('You already have a pending purchase for this workflow. Please complete or cancel it first.');
        }
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Purchase "${workflow.name}" for $5.00?\n\n` +
        `This is a development purchase flow. In production, this would redirect to payment checkout.`
      );

      if (!confirmed) {
        setPurchasingWorkflowId(null);
        return;
      }

      // Create purchase record with 'paid' status (dev mode)
      await createPurchase({
        workflowId: workflow.id,
        userId: user.id,
        provider: 'dev',
        amount: 500, // $5.00 in cents
        currency: 'usd',
        status: 'paid', // Directly mark as paid in dev mode
      });

      // Update UI to show purchased state
      setPurchasedWorkflowIds((prev) => new Set([...prev, workflow.id]));

      // Show success message
      window.alert(`Successfully purchased "${workflow.name}"!`);
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Failed to start purchase');
    } finally {
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
                      {isPurchased ? (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-500/35 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          Purchased
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

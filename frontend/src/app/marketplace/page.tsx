'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { getSupabaseClient } from '@/lib/supabase';

type MarketplaceWorkflowCard = {
  name: string;
  description: string | null;
};

function WorkflowMarketplaceContent() {
  const [workflows, setWorkflows] = useState<MarketplaceWorkflowCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadWorkflows = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        const { data, error: queryError } = await supabase
          .from('workflows')
          .select('name, description')
          .order('updated_at', { ascending: false });

        if (!active) return;

        if (queryError) {
          throw new Error(queryError.message);
        }

        setWorkflows((data ?? []) as MarketplaceWorkflowCard[]);
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

  return (
    <RequireAuth>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-2xl border border-app bg-app-surface/75 p-4 md:p-5">
          <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Marketplace</h1>
          <p className="mt-1 text-sm text-app-soft">Explore available workflows.</p>
        </section>

        <section className="rounded-2xl border border-app bg-app-surface/70 p-4">
          {loading ? (
            <div className="rounded-xl border border-app bg-app-surface p-6 text-sm text-app-soft">Loading workflows…</div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-6 text-sm text-rose-300">{error}</div>
          ) : workflows.length === 0 ? (
            <div className="rounded-xl border border-app bg-app-surface p-6 text-sm text-app-soft">No workflows available.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {workflows.map((workflow, index) => (
                <article key={`${workflow.name}-${index}`} className="rounded-xl border border-app bg-app-card/80 p-4">
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
                </article>
              ))}
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

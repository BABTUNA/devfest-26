'use client';

import { useState } from 'react';
import { X, Loader2, PackagePlus } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { createWorkflow } from '@/features/workflows/workflows.api';
import type { Node, Edge } from '@xyflow/react';

interface CreateProductModalProps {
  onClose: () => void;
  onSuccess: (workflow: { id: string; name: string; description: string | null }) => void;
  nodes: Node[];
  edges: Edge[];
}

function dollarsToCents(raw: string): number | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100);
}

export function CreateProductModal({ onClose, onSuccess, nodes, edges }: CreateProductModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [listForSale, setListForSale] = useState(true);
  const [priceDollars, setPriceDollars] = useState('5.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('You must be logged in to create an agent');
      }

      const priceInCents = listForSale ? dollarsToCents(priceDollars) : null;
      if (listForSale && priceInCents == null) {
        throw new Error('Enter a valid sale price greater than 0.');
      }

      const workflow = await createWorkflow(
        {
          name,
          description: description || undefined,
          definition: { nodes, edges },
          isPublished: listForSale,
          priceInCents,
        },
        user.id
      );

      onSuccess(workflow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-app bg-app-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-app p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-app-fg">
            <PackagePlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Create New Agent
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-app-soft hover:bg-app-card hover:text-app-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-app-fg">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Resume Optimizer"
                className="w-full rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-app-fg">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent do?"
                className="w-full resize-none rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="rounded-lg border border-app bg-app/60 p-3">
              <label className="flex items-center gap-2 text-sm text-app-fg">
                <input
                  type="checkbox"
                  checked={listForSale}
                  onChange={(event) => setListForSale(event.target.checked)}
                  className="h-4 w-4 rounded border-app bg-app text-blue-500 focus:ring-2 focus:ring-blue-500/40"
                />
                List this workflow for sale in Marketplace
              </label>

              {listForSale && (
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-app-soft">
                    Sale Price (USD)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    className="w-full rounded-lg border border-app bg-app px-3 py-2 text-sm text-app-fg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-rose-300 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-app-soft hover:text-app-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

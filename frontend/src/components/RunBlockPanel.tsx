'use client';

import { useState, useMemo } from 'react';
import { X, Play, Loader2, Lock, Link2, Coins } from 'lucide-react';
import { getBlockById, type BlockId } from 'shared';
import { useAppBilling } from '@/contexts/AppBillingContext';
import { useTokens } from '@/contexts/TokenContext';
import { useExecutionLog } from '@/store/executionLog';
import { useFlowRunStore } from '@/store/flowRunStore';
import { getInputSource } from '@/lib/workflowLogic';
import { createCheckoutSession, runBlock } from '@/lib/api';
import type { Node, Edge } from '@xyflow/react';

type NodeData = { blockId: string; label: string; icon?: string };

export function RunBlockPanel({
  nodeId,
  data,
  nodes = [],
  edges = [],
  onClose,
}: {
  nodeId: string;
  data: NodeData;
  nodes?: Node[];
  edges?: Edge[];
  onClose: () => void;
}) {
  const block = getBlockById(data.blockId as BlockId);
  const { hasFeatureAccess } = useAppBilling();
  const hasAccess = block ? hasFeatureAccess(block.featureSlug) : false;
  const { balance, deductLocally, refresh: refreshTokens } = useTokens();
  const getOutput = useFlowRunStore((s) => s.getOutput);
  const setNodeOutput = useFlowRunStore((s) => s.setNodeOutput);
  const getOutputs = useFlowRunStore((s) => s.outputsByNode[nodeId]);

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<Record<string, unknown> | null>(() => getOutputs ?? null);
  const [error, setError] = useState<string | null>(null);
  const [needsTokens, setNeedsTokens] = useState(false);
  const [loading, setLoading] = useState(false);
  const logAdd = useExecutionLog((s) => s.add);

  const textInputs = block?.inputs?.filter((i) => i.type === 'text') ?? [];
  const inputSources = useMemo(() => {
    return textInputs.map((input) => ({
      ...input,
      source: getInputSource(nodeId, input.key, edges, nodes),
    }));
  }, [nodeId, textInputs, edges, nodes]);

  const resolvedInputs = useMemo(() => {
    const out: Record<string, string> = {};
    inputSources.forEach(({ key, source }) => {
      if (source.type === 'connected') {
        const v = getOutput(source.sourceNodeId, source.sourceHandle);
        out[key] = v != null ? String(v) : '';
      } else {
        out[key] = inputs[key] ?? '';
      }
    });
    return out;
  }, [inputSources, getOutput, inputs]);

  const hasMissingConnected = inputSources.some(({ source }) => {
    if (source.type !== 'connected') return false;
    const v = getOutput(source.sourceNodeId, source.sourceHandle);
    return v === undefined || v === null;
  });
  const missingLabel = hasMissingConnected
    ? inputSources.find(({ source }) => source.type === 'connected' && getOutput(source.sourceNodeId, source.sourceHandle) == null)?.source
    : null;

  if (!block) {
    return (
      <div className="flex h-full w-96 flex-col border-l border-app bg-app-surface">
        <div className="flex items-center justify-between border-b border-app p-3">
          <span className="text-sm font-medium text-app-soft">Unknown block</span>
          <button onClick={onClose} className="rounded p-1 text-app-soft hover:bg-app-surface">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 text-sm text-app-soft">Block definition not found.</div>
      </div>
    );
  }

  const handleRun = async () => {
    if (!hasAccess) return;
    setLoading(true);
    setError(null);
    setNeedsTokens(false);
    setOutput(null);
    const payload = { ...resolvedInputs };
    try {
      const json = await runBlock({ blockId: block.id, inputs: payload });
      if (block.tokenCost > 0) {
        deductLocally(block.tokenCost);
      }
      const outputs = json.outputs ?? {};
      setOutput(outputs);
      setNodeOutput(nodeId, outputs);
      logAdd({ blockName: data.label, blockId: block.id, success: true, output: outputs });
    } catch (e) {
      const err = e as Error & { status?: number; data?: { needsPurchase?: boolean; tokenCost?: number; currentBalance?: number } };
      if (err.status === 402 && err.data?.needsPurchase) {
        setError(`Insufficient tokens. Need ${err.data.tokenCost ?? block.tokenCost}, you have ${err.data.currentBalance ?? balance}.`);
        setNeedsTokens(true);
        logAdd({ blockName: data.label, blockId: block.id, success: false, error: 'Insufficient tokens' });
      } else {
        const errMsg = err.message || 'Request failed';
        setError(errMsg);
        logAdd({ blockName: data.label, blockId: block.id, success: false, error: errMsg });
      }
    } finally {
      setLoading(false);
      refreshTokens();
    }
  };

  const canRun =
    !hasMissingConnected &&
    (!block.inputs.some((i) => i.required) || textInputs.every((i) => (resolvedInputs[i.key] ?? '').trim()));

  return (
    <div className="flex h-full w-96 shrink-0 flex-col border-l border-app bg-app-surface">
      <div className="flex items-center justify-between border-b border-app p-3">
        <span className="text-sm font-medium text-app-fg">Run: {data.label}</span>
        <button onClick={onClose} className="rounded p-1 text-app-soft hover:bg-app-card" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!hasAccess ? (
          <div className="rounded-lg border border-amber-300 dark:border-amber-500/35 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              This block is locked
            </p>
            <p className="mb-3 text-amber-800 dark:text-amber-100/90">Unlock it to run from the Lab canvas.</p>
            <button
              onClick={async () => {
                const baseUrl = window.location.origin;
                const session = await createCheckoutSession({
                  priceSlug: block.priceSlug,
                  successUrl: `${baseUrl}/marketplace?checkout=success`,
                  cancelUrl: `${baseUrl}/lab`,
                });
                if (!session?.url) {
                  setError('Checkout URL missing from backend response');
                  return;
                }
                window.location.href = session.url;
              }}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
            >
              Unlock block
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-app-soft">
              Connected inputs consume cached output from upstream blocks. Run upstream blocks first if values are missing.
            </p>
            {inputSources.map(({ key, label, source }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-app-soft">{label}</label>
                {source.type === 'connected' ? (
                  <div className="rounded-lg border border-app bg-app-card px-3 py-2 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                      <Link2 className="h-3.5 w-3.5 shrink-0" />
                      From {source.sourceLabel}.{source.sourceHandle}
                    </div>
                    {getOutput(source.sourceNodeId, source.sourceHandle) != null ? (
                      <p className="mt-1 truncate text-app-fg" title={String(getOutput(source.sourceNodeId, source.sourceHandle))}>
                        {String(getOutput(source.sourceNodeId, source.sourceHandle))}
                      </p>
                    ) : (
                      <p className="mt-1 text-amber-700 dark:text-amber-300">Run upstream block first</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    placeholder={block.inputs?.find((i) => i.key === key)?.required ? 'Required' : 'Optional'}
                    value={inputs[key] ?? ''}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full resize-none rounded-lg border border-app bg-app-card px-3 py-2 text-sm text-app-fg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                )}
              </div>
            ))}
            {block.inputs.some((i) => i.type === 'file') && <p className="text-xs text-app-soft">File input blocks are best run from Marketplace.</p>}
            {missingLabel && missingLabel.type === 'connected' && (
              <p className="text-xs text-amber-700 dark:text-amber-300">Run &quot;{missingLabel.sourceLabel}&quot; first to fill connected inputs.</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleRun}
                disabled={loading || !canRun}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run
              </button>
              {block.tokenCost > 0 && (
                 <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Coins className="h-3.5 w-3.5" />
                  <span>{block.tokenCost} token{block.tokenCost !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </>
        )}
        {error && <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        {output != null && (
          <div>
            <p className="mb-1 text-xs font-medium text-app-soft">Output (cached for downstream)</p>
            <pre className="max-h-48 overflow-auto rounded-lg border border-app bg-app-card p-3 text-xs text-app-fg">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { memo } from 'react';
import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { Brain, Mail, PenLine, TestTube, FileStack, Play, Layers, Type, GitBranch, Check, Languages, Volume2, Mic, MessageSquare, Hash, Globe2 } from 'lucide-react';
import { getBlockById, type BlockId } from 'shared';
import { useFlowRunStore } from '@/store/flowRunStore';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Mail,
  PenLine,
  TestTube,
  FileStack,
  Play,
  Layers,
  Type,
  GitBranch,
  Languages,
  Volume2,
  Mic,
  MessageSquare,
  Hash,
  Globe2,
};

/** Mock output type for display when not in schema */
function mockOutputType(key: string): string {
  if (key === 'emails' || key === 'rewritten' || key === 'summary' || key === 'combined' || key === 'value') return 'string';
  if (key === 'label') return 'string';
  if (key === 'confidence') return 'number';
  if (key === 'mergedUrl') return 'string';
  if (key === 'trigger') return 'boolean';
  if (key === 'match') return 'boolean';
  return 'any';
}

export type BlockNodeData = { blockId: string; label: string; icon?: string };
export type BlockFlowNode = Node<BlockNodeData, 'block'>;

function BlockNodeComponent({
  id,
  data,
  selected,
}: NodeProps<BlockFlowNode>) {
  const block = getBlockById((data.blockId || 'summarize-text') as BlockId);
  const Icon = data.icon && ICON_MAP[data.icon] ? ICON_MAP[data.icon] : Brain;
  const inputs = block?.inputs ?? [{ key: 'input', label: 'Input', type: 'text' as const }];
  const outputs = block?.outputs ?? [{ key: 'output', label: 'Output' }];
  const hasCachedOutput = useFlowRunStore((s) => !!s.outputsByNode[id] && Object.keys(s.outputsByNode[id]).length > 0);

  return (
    <div
      className={`min-w-[220px] overflow-hidden rounded-2xl border bg-app-surface shadow-lg backdrop-blur transition ${
        selected ? 'border-blue-500 ring-2 ring-blue-500/35' : 'border-app hover:border-blue-500/45'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-app bg-app-card px-3 py-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app bg-app-surface">
          <Icon className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
        </span>
        <span className="flex-1 truncate text-sm font-medium text-app-fg">{data.label}</span>
        {hasCachedOutput && (
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300" title="Has cached output">
            <Check className="h-3 w-3" />
            out
          </span>
        )}
      </div>

      {/* Inputs (left handles) */}
      <div className="space-y-1 px-2 pb-1 pt-1.5">
        <p className="mb-0.5 px-1 text-[10px] uppercase tracking-wider text-app-soft">Inputs</p>
        {inputs.map((input) => (
          <div
            key={input.key}
            className="flex items-center gap-2 relative min-h-[24px]"
            style={{ paddingLeft: 4 }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={input.key}
              className="!-left-1.5 !h-2.5 !w-2.5 !border-2 !border-[rgb(var(--app-bg))] !bg-amber-400"
            />
            <span className="flex-1 truncate text-xs text-app-soft" title={`${input.label} (${input.type})`}>
              {input.label} <span className="text-[11px] text-app-soft">({input.type})</span>
            </span>
          </div>
        ))}
      </div>

      {/* Outputs (right handles) */}
      <div className="space-y-1 border-t border-app px-2 pb-1.5 pt-1">
        <p className="mb-0.5 px-1 text-right text-[10px] uppercase tracking-wider text-app-soft">Outputs</p>
        {outputs.map((output) => (
          <div
            key={output.key}
            className="flex items-center justify-end gap-2 relative min-h-[24px]"
            style={{ paddingRight: 4 }}
          >
            <span className="flex-1 truncate text-right text-xs text-app-soft" title={`${output.label}`}>
              {output.label} <span className="text-[11px] text-app-soft">({mockOutputType(output.key)})</span>
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.key}
              className="!-right-1.5 !h-2.5 !w-2.5 !border-2 !border-[rgb(var(--app-bg))] !bg-emerald-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const BlockNode = memo(BlockNodeComponent);

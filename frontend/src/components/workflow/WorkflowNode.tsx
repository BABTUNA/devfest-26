'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Brain, Mail, PenLine, TestTube, FileStack, Layers, Type,
  GitBranch, Zap, FileText, Upload, Settings, Trash2,
  TextSearch, CheckCircle2, BarChart3,
  Globe, Save, SendHorizonal, ScrollText,
  Languages, Volume2, Mic, MessageSquare, Hash, Globe2, Repeat,
} from 'lucide-react';
import type { WorkflowNodeData } from '@/types/workflowTypes';

// ── Icon map ──
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain, Mail, PenLine, TestTube, FileStack, Layers, Type, GitBranch,
  Zap, FileText, Upload, Settings, Trash2,
  TextSearch, CheckCircle2, BarChart3,
  Globe, Save, SendHorizonal, ScrollText,
  Languages, Volume2, Mic, MessageSquare, Hash, Globe2,
};

// ── Category colours ──
const CATEGORY_STYLES: Record<string, { border: string; headerBg: string; badge: string; handle: string }> = {
  trigger: { border: 'border-emerald-500/60', headerBg: 'bg-emerald-900/40', badge: 'bg-emerald-500/20 text-emerald-400', handle: '!bg-emerald-500/90' },
  ai: { border: 'border-sky-500/60', headerBg: 'bg-sky-900/40', badge: 'bg-sky-500/20 text-sky-400', handle: '!bg-sky-500/90' },
  condition: { border: 'border-amber-500/60', headerBg: 'bg-amber-900/40', badge: 'bg-amber-500/20 text-amber-400', handle: '!bg-amber-500/90' },
  action: { border: 'border-violet-500/60', headerBg: 'bg-violet-900/40', badge: 'bg-violet-500/20 text-violet-400', handle: '!bg-violet-500/90' },
};

function WorkflowNodeComponent({
  id,
  data,
  selected,
}: {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}) {
  const style = CATEGORY_STYLES[data.category] ?? CATEGORY_STYLES.action;
  const Icon = ICON_MAP[data.icon] ?? Brain;
  const isExecuting = data.isExecuting ?? false;

  return (
    <div
      className={`min-w-[180px] max-w-[220px] rounded-xl border bg-zinc-900 shadow-lg overflow-hidden transition-all ${isExecuting
        ? 'border-yellow-400 ring-2 ring-yellow-400/60 animate-pulse'
        : selected
          ? `${style.border} ring-2 ring-white/20`
          : style.border
        }`}
    >
      {/* ── Inbound handle ── */}
      {data.category !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          className={`!w-3 !h-3 ${style.handle} !border-2 !border-zinc-800 !-left-1.5`}
        />
      )}

      {/* ── Header ── */}
      <div className={`flex items-center gap-2 px-3 py-2 ${style.headerBg}`}>
        <Icon className="h-4 w-4 shrink-0 text-white/80" />
        <span className="font-medium text-xs truncate text-zinc-100 flex-1">{data.label}</span>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${style.badge}`}>
          {isExecuting ? '⚡ RUN' : data.badgeLabel}
        </span>
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center justify-end gap-1 px-2 py-1 border-t border-zinc-800/60">
        {data.config?.maxIterations ? (
          <span className="flex items-center gap-0.5 text-[9px] text-orange-400/80 mr-auto" title={`Loop: max ${data.config.maxIterations} iterations`}>
            <Repeat className="h-2.5 w-2.5" /> {String(data.config.maxIterations)}
          </span>
        ) : null}
        {data.onSettings && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onSettings?.(id, data.blockType, data.config);
            }}
            className="p-1 rounded hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition"
            title="Settings"
          >
            <Settings className="h-3 w-3" />
          </button>
        )}
        {data.onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
            className="p-1 rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ── Input/Output Content (Optional) ── */}
      {(data.input || data.output) && (
        <div className="px-3 py-2 space-y-2 text-[10px] bg-zinc-900/40 border-t border-zinc-800/60">
          {data.input && (
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider font-medium opacity-70">Input</span>
              <div className="bg-zinc-950/50 rounded p-1.5 font-mono text-zinc-300 break-words whitespace-pre-wrap border border-zinc-800/50">
                {data.input.length > 80 ? data.input.slice(0, 80) + '...' : data.input}
              </div>
            </div>
          )}
          {data.output && (
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider font-medium opacity-70">Output</span>
              <div className="bg-zinc-950/50 rounded p-1.5 font-mono text-emerald-400/90 break-words whitespace-pre-wrap border border-zinc-800/50">
                {data.output.length > 80 ? data.output.slice(0, 80) + '...' : data.output}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Outbound handle ── */}
      <Handle
        type="source"
        position={Position.Right}
        className={`!w-3 !h-3 ${style.handle} !border-2 !border-zinc-800 !-right-1.5`}
      />
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);

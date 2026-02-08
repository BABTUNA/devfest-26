'use client';

import { useState } from 'react';
import {
  Brain, Mail, PenLine, TestTube, FileStack, Layers, Type, GitBranch,
  Zap, FileText, Upload,
  TextSearch, CheckCircle2, BarChart3,
  Globe, Save, SendHorizonal, ScrollText,
  Search, ChevronDown, ChevronRight,
  Languages, Volume2, Mic, MessageSquare, Hash, Globe2,
} from 'lucide-react';
import type { WorkflowBlockTemplate, WorkflowCategory } from '@/types/workflowTypes';

// ══════════════════════════════════════════════════════
//  Block template definitions
// ══════════════════════════════════════════════════════

const TRIGGER_TEMPLATES: WorkflowBlockTemplate[] = [
  { id: 'manual_trigger', label: 'Manual Trigger', icon: 'Zap', category: 'trigger' },
  { id: 'on_text_input', label: 'On Text Input', icon: 'FileText', category: 'trigger' },
  { id: 'on_file_upload', label: 'On File Upload', icon: 'Upload', category: 'trigger' },
];

const AI_TEMPLATES: WorkflowBlockTemplate[] = [
  { id: 'summarize-text', label: 'Summarize Text', icon: 'Brain', category: 'ai', blockId: 'summarize-text' },
  { id: 'extract-emails', label: 'Extract Emails', icon: 'Mail', category: 'ai', blockId: 'extract-emails' },
  { id: 'rewrite-prompt', label: 'Rewrite Prompt', icon: 'PenLine', category: 'ai', blockId: 'rewrite-prompt' },
  { id: 'classify-input', label: 'Classify Input', icon: 'TestTube', category: 'ai', blockId: 'classify-input' },
  { id: 'merge-pdfs', label: 'Merge PDFs', icon: 'FileStack', category: 'ai', blockId: 'merge-pdfs' },
  { id: 'text-join', label: 'Text Join', icon: 'Layers', category: 'ai', blockId: 'text-join' },
  { id: 'constant', label: 'Constant', icon: 'Type', category: 'ai', blockId: 'constant' },
  { id: 'conditional', label: 'Conditional', icon: 'GitBranch', category: 'ai', blockId: 'conditional' },
  { id: 'translate-text', label: 'Translate Text', icon: 'Languages', category: 'ai', blockId: 'translate-text' },
  { id: 'text-to-speech', label: 'Text to Speech', icon: 'Volume2', category: 'ai', blockId: 'text-to-speech' },
  { id: 'speech-to-text', label: 'Speech to Text', icon: 'Mic', category: 'ai', blockId: 'speech-to-text' },
  { id: 'fetch-url', label: 'Fetch URL', icon: 'Globe2', category: 'ai', blockId: 'fetch-url' },
  { id: 'audio-player', label: 'Audio Player', icon: 'Volume2', category: 'ai', blockId: 'audio-player' },
  { id: 'browser-agent', label: 'Browser Agent', icon: 'Globe2', category: 'ai', blockId: 'browser-agent' },
];

const CONDITION_TEMPLATES: WorkflowBlockTemplate[] = [
  { id: 'text_contains', label: 'Text Contains', icon: 'TextSearch', category: 'condition' },
  { id: 'text_not_empty', label: 'Text Not Empty', icon: 'CheckCircle2', category: 'condition' },
  { id: 'confidence_check', label: 'Confidence Check', icon: 'BarChart3', category: 'condition' },
];

const ACTION_TEMPLATES: WorkflowBlockTemplate[] = [
  { id: 'log_output', label: 'Log Output', icon: 'ScrollText', category: 'action' },
  { id: 'webhook', label: 'Webhook', icon: 'Globe', category: 'action' },
  { id: 'save_result', label: 'Save Result', icon: 'Save', category: 'action' },
  { id: 'send_email', label: 'Send Email', icon: 'SendHorizonal', category: 'action' },
  { id: 'send-slack', label: 'Send to Slack', icon: 'MessageSquare', category: 'action', blockId: 'send-slack' },
  { id: 'send-discord', label: 'Send to Discord', icon: 'Hash', category: 'action', blockId: 'send-discord' },
];

export const ALL_TEMPLATES = [
  ...TRIGGER_TEMPLATES,
  ...AI_TEMPLATES,
  ...CONDITION_TEMPLATES,
  ...ACTION_TEMPLATES,
];

// ── Icon lookup ──
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain, Mail, PenLine, TestTube, FileStack, Layers, Type, GitBranch,
  Zap, FileText, Upload,
  TextSearch, CheckCircle2, BarChart3,
  Globe, Save, SendHorizonal, ScrollText,
  Languages, Volume2, Mic, MessageSquare, Hash, Globe2,
};

// ── Category styling ──
const CAT_STYLE: Record<WorkflowCategory, { dot: string; hover: string; label: string }> = {
  trigger: { dot: 'bg-emerald-400', hover: 'hover:border-emerald-500/50 hover:bg-emerald-900/20', label: 'Triggers' },
  ai: { dot: 'bg-sky-400', hover: 'hover:border-sky-500/50 hover:bg-sky-900/20', label: 'AI Blocks' },
  condition: { dot: 'bg-amber-400', hover: 'hover:border-amber-500/50 hover:bg-amber-900/20', label: 'Conditions' },
  action: { dot: 'bg-violet-400', hover: 'hover:border-violet-500/50 hover:bg-violet-900/20', label: 'Actions' },
};

// ══════════════════════════════════════════════════════
//  Section (collapsible)
// ══════════════════════════════════════════════════════
function Section({
  category,
  templates,
  search,
  onAdd,
}: {
  category: WorkflowCategory;
  templates: WorkflowBlockTemplate[];
  search: string;
  onAdd: (t: WorkflowBlockTemplate) => void;
}) {
  const [open, setOpen] = useState(true);
  const style = CAT_STYLE[category];
  const q = search.toLowerCase();
  const filtered = q
    ? templates.filter((t) => t.label.toLowerCase().includes(q))
    : templates;

  if (filtered.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-1 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        {style.label}
        <span className="text-zinc-600 ml-auto font-normal normal-case">{filtered.length}</span>
      </button>

      {open && (
        <div className="space-y-1 mt-1">
          {filtered.map((t) => {
            const Icon = ICON_MAP[t.icon] ?? Brain;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onAdd(t)}
                className={`flex items-center gap-2 w-full rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-3 py-2 text-left transition ${style.hover}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                <span className="text-xs font-medium text-zinc-200 truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Palette
// ══════════════════════════════════════════════════════
export function WorkflowPalette({ onAdd }: { onAdd: (t: WorkflowBlockTemplate) => void }) {
  const [search, setSearch] = useState('');

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/80 overflow-hidden">
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Workflow Blocks</h3>
        <p className="text-zinc-500 text-[10px] mt-0.5">Click to add to canvas</p>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 pl-7 pr-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <Section category="trigger" templates={TRIGGER_TEMPLATES} search={search} onAdd={onAdd} />
        <Section category="ai" templates={AI_TEMPLATES} search={search} onAdd={onAdd} />
        <Section category="condition" templates={CONDITION_TEMPLATES} search={search} onAdd={onAdd} />
        <Section category="action" templates={ACTION_TEMPLATES} search={search} onAdd={onAdd} />
      </div>
    </aside>
  );
}

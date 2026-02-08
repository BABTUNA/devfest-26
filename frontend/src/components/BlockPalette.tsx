'use client';

import { useState, useMemo } from 'react';
import {
  Brain, Mail, PenLine, TestTube, FileStack, Play, Layers, Type, GitBranch,
  Search, Lock, Languages, Volume2, Mic, MessageSquare, Hash, Globe2,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { BLOCK_DEFINITIONS, type BlockDefinition, type BlockId } from 'shared';
import { useAppBilling } from '@/contexts/AppBillingContext';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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

const DRAG_TYPE = 'application/reactflow';

function onDragStart(event: React.DragEvent, blockId: string, label: string, icon: string) {
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ type: 'block', blockId, label, icon }));
  event.dataTransfer.effectAllowed = 'move';
}

type PaletteCategory = 'ai' | 'tool' | 'utility' | 'integration';

const AI_BLOCK_IDS: BlockId[] = [
  'summarize-text', 'extract-emails', 'rewrite-prompt', 'classify-input',
  'translate-text', 'text-to-speech', 'speech-to-text',
];
const INTEGRATION_BLOCK_IDS: BlockId[] = ['send-slack', 'send-discord', 'fetch-url'];
const UTILITY_BLOCK_IDS: BlockId[] = ['trigger', 'text-join', 'constant', 'conditional'];

function getBlockCategory(block: BlockDefinition): PaletteCategory {
  if (AI_BLOCK_IDS.includes(block.id)) return 'ai';
  if (INTEGRATION_BLOCK_IDS.includes(block.id)) return 'integration';
  if (UTILITY_BLOCK_IDS.includes(block.id)) return 'utility';
  return 'tool';
}

const CATEGORY_META: Record<PaletteCategory, { dot: string; label: string }> = {
  ai:          { dot: 'bg-sky-400',     label: 'AI Blocks' },
  tool:        { dot: 'bg-emerald-400', label: 'Tools' },
  utility:     { dot: 'bg-amber-400',   label: 'Utilities' },
  integration: { dot: 'bg-violet-400',  label: 'Integrations' },
};

const CATEGORY_ORDER: PaletteCategory[] = ['ai', 'tool', 'utility', 'integration'];

function CategorySection({
  category,
  blocks,
  hasFeatureAccess,
  loaded,
  onAddBlock,
}: {
  category: PaletteCategory;
  blocks: BlockDefinition[];
  hasFeatureAccess: (slug: string) => boolean;
  loaded: boolean;
  onAddBlock?: (block: BlockDefinition) => void;
}) {
  const [open, setOpen] = useState(true);
  const meta = CATEGORY_META[category];

  if (blocks.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-wider text-app-soft hover:text-app-fg"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
        {meta.label}
        <span className="ml-auto font-normal normal-case text-app-soft/60">{blocks.length}</span>
      </button>

      {open && (
        <div className="mt-1 space-y-1.5">
          {blocks.map((block) => {
            const Icon = ICON_MAP[block.icon] ?? Brain;
            const hasAccess = DEMO_MODE || !loaded || hasFeatureAccess(block.featureSlug);
            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => onDragStart(e, block.id, block.name, block.icon)}
                onClick={() => onAddBlock?.(block)}
                className={`group cursor-grab rounded-xl border px-3 py-2.5 transition active:cursor-grabbing ${
                  hasAccess
                    ? 'border-app bg-app-surface text-app-fg hover:border-blue-500/60 hover:bg-app-surface'
                    : 'border-amber-300 dark:border-amber-500/35 bg-amber-50 dark:bg-amber-500/10 text-app-fg hover:border-amber-400 dark:hover:border-amber-500/60'
                }`}
                title={hasAccess ? block.description : 'Locked block: unlock in Marketplace or from Run panel'}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app bg-app-card">
                    <Icon className={`h-3.5 w-3.5 ${hasAccess ? 'text-blue-700 dark:text-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-200' : 'text-amber-700 dark:text-amber-300'}`} />
                  </span>
                  <span className="truncate text-sm font-medium">{block.name}</span>
                  {!hasAccess && <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" />}
                </div>
                <p className="mt-1 truncate text-[11px] text-app-soft">{block.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BlockPalette({
  onAddBlock,
}: {
  onAddBlock?: (block: BlockDefinition) => void;
}) {
  const [search, setSearch] = useState('');
  const { hasFeatureAccess, loaded } = useAppBilling();

  const filtered = useMemo(() => {
    if (!search.trim()) return BLOCK_DEFINITIONS;
    const q = search.toLowerCase();
    return BLOCK_DEFINITIONS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map: Record<PaletteCategory, BlockDefinition[]> = { ai: [], tool: [], utility: [], integration: [] };
    for (const block of filtered) {
      map[getBlockCategory(block)].push(block);
    }
    return map;
  }, [filtered]);

  return (
    <aside
      className="w-64 shrink-0 overflow-hidden border-r border-app bg-app-surface/70"
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="border-b border-app p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-app-soft">
          Blocks Library
        </h3>
        <p className="mt-1 text-xs text-app-soft">
          Drag or click to place on canvas
        </p>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-soft" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="w-full rounded-lg border border-app bg-app-surface py-2 pl-8 pr-2 text-xs text-app-fg placeholder:text-app-soft focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-app px-3 py-2 text-[11px] uppercase tracking-wide text-app-soft">
        <span>{filtered.length} available</span>
        <span>Click = quick add</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-2.5">
        {filtered.length === 0 ? (
          <p className="py-2 text-xs text-app-soft">No blocks match this search.</p>
        ) : (
          CATEGORY_ORDER.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              blocks={grouped[cat]}
              hasFeatureAccess={hasFeatureAccess}
              loaded={loaded}
              onAddBlock={onAddBlock}
            />
          ))
        )}
      </div>
    </aside>
  );
}

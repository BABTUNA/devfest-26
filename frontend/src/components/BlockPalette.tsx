'use client';

import { useState, useMemo } from 'react';
import { Brain, Mail, PenLine, TestTube, FileStack, Play, Layers, Type, GitBranch, Search } from 'lucide-react';
import { BLOCK_DEFINITIONS, type BlockDefinition } from 'shared';

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
};

const DRAG_TYPE = 'application/reactflow';

function onDragStart(event: React.DragEvent, blockId: string, label: string, icon: string) {
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ type: 'block', blockId, label, icon }));
  event.dataTransfer.effectAllowed = 'move';
}

export function BlockPalette({
  onAddBlock,
}: {
  onAddBlock?: (block: BlockDefinition) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return BLOCK_DEFINITIONS;
    const q = search.toLowerCase();
    return BLOCK_DEFINITIONS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [search]);

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
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2.5">
        {filtered.length === 0 ? (
          <p className="py-2 text-xs text-app-soft">No blocks match this search.</p>
        ) : (
          filtered.map((block) => {
            const Icon = ICON_MAP[block.icon] ?? Brain;
            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => onDragStart(e, block.id, block.name, block.icon)}
                onClick={() => onAddBlock?.(block)}
                className="group cursor-grab rounded-xl border border-app bg-app-surface px-3 py-2.5 text-app-fg transition hover:border-blue-500/60 hover:bg-app-surface active:cursor-grabbing"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app bg-app-card">
                    <Icon className="h-3.5 w-3.5 text-blue-300 group-hover:text-blue-200" />
                  </span>
                  <span className="truncate text-sm font-medium">{block.name}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-app-soft">{block.description}</p>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

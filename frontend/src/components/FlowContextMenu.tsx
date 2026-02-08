'use client';

import { useEffect, useRef } from 'react';
import { Play, Trash2 } from 'lucide-react';

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
};

export function FlowContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded-xl border border-app bg-app-surface shadow-xl py-1 backdrop-blur"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
            item.danger
              ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
              : 'text-app-fg hover:bg-app-card'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function runBlockItem(onRun: () => void): MenuItem {
  return { label: 'Run block', icon: <Play className="h-4 w-4" />, onClick: onRun };
}

export function removeNodeItem(onRemove: () => void): MenuItem {
  return { label: 'Remove', icon: <Trash2 className="h-4 w-4" />, onClick: onRemove, danger: true };
}

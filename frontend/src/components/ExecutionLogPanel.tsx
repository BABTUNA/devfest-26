'use client';

import { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useExecutionLog } from '@/store/executionLog';

export function ExecutionLogPanel() {
  const { entries, clear, isVisible, setVisible } = useExecutionLog();
  const [expanded, setExpanded] = useState(false);

  if (!isVisible || entries.length === 0) return null;

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          aria-hidden
          onClick={() => setExpanded(false)}
        />
      )}
      <div
        className={`fixed z-50 flex flex-col rounded-t-xl border border-b-0 border-app bg-app-surface shadow-xl backdrop-blur ${expanded
          ? 'left-4 right-4 top-20 bottom-20 md:left-1/4 md:right-1/4'
          : 'right-4 bottom-4 w-80 max-w-[calc(100vw-2rem)]'
          }`}
      >
        <div className="flex items-center justify-between border-b border-app px-3 py-2">
          <span className="text-sm font-medium text-app-fg">Execution log</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="rounded p-1 text-app-soft hover:bg-app-card hover:text-app-fg"
              title={expanded ? 'Minimize' : 'Expand'}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => clear()}
              className="rounded p-1 text-app-soft hover:bg-app-card hover:text-app-fg"
              title="Clear log"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="rounded p-1 text-app-soft hover:bg-app-card hover:text-app-fg"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg border p-2 ${entry.success
                ? 'border-app bg-app-card/80'
                : 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-app-fg truncate">{entry.blockName}</span>
                <span className="shrink-0 text-app-soft">
                  {new Date(entry.at).toLocaleTimeString()}
                </span>
              </div>
              {entry.error && (
                <p className="mt-1 text-rose-700 dark:text-rose-300">{entry.error}</p>
              )}
              {entry.success && entry.output != null && Object.keys(entry.output).length > 0 && (
                <pre className="mt-1 overflow-auto rounded bg-app p-2 text-app-soft max-h-32">
                  {JSON.stringify(entry.output, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

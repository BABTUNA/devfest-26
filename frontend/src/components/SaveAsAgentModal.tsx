'use client';

import { useState } from 'react';
import { X, Bot, Save } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-app bg-app-card px-3 py-2 text-sm text-app-fg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none';

export function SaveAsAgentModal({
  onSave,
  onClose,
}: {
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-app bg-app-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-app-fg">Save as Agent</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-app-soft hover:bg-app-card"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          <p className="text-xs text-app-soft">
            Save the current workflow as a reusable agent block. When you drag it onto the canvas, the entire workflow will be placed automatically.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-app-soft">
              Agent Name
            </label>
            <input
              type="text"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Translate & Notify"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  onSave(name.trim());
                }
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-app px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-app px-4 py-2 text-sm font-medium text-app-soft hover:bg-app-card"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onSave(name.trim())}
            className="flex inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            Save Agent
          </button>
        </div>
      </div>
    </div>
  );
}

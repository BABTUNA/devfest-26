'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export type EntryInputField = {
  nodeId: string;
  nodeLabel: string;
  inputKey: string;
  label: string;
};

export function EntryInputsModal({
  fields,
  onSubmit,
  onCancel,
}: {
  fields: EntryInputField[];
  onSubmit: (values: Record<string, Record<string, string>>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const out: Record<string, Record<string, string>> = {};
    fields.forEach((f) => {
      if (!out[f.nodeId]) out[f.nodeId] = {};
      out[f.nodeId][f.inputKey] = '';
    });
    return out;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl border border-app bg-app-surface shadow-xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-app px-4 py-3">
          <h3 className="text-sm font-semibold text-app-fg">Workflow entry inputs</h3>
          <button type="button" onClick={onCancel} className="rounded p-1 text-app-soft hover:bg-app-card hover:text-app-fg">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="px-4 py-2 text-xs text-app-soft">
          These inputs have no connection. Provide values for the first run.
        </p>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {fields.map((f) => (
            <div key={`${f.nodeId}-${f.inputKey}`}>
              <label className="block text-xs font-medium text-app-soft mb-1">{f.label}</label>
              <input
                type="text"
                value={values[f.nodeId]?.[f.inputKey] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [f.nodeId]: { ...prev[f.nodeId], [f.inputKey]: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-app bg-app-card px-3 py-2 text-sm text-app-fg focus:border-blue-500 focus:outline-none"
                placeholder="Enter value"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-app px-4 py-2 text-sm font-medium text-app-soft hover:bg-app-card hover:text-app-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Run workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

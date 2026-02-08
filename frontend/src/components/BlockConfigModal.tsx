'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { getBlockById, type BlockId } from 'shared';
import { getElevenLabsVoices, type ElevenLabsVoice } from '@/lib/api';
import type { BlockNodeData } from './BlockNode';

export type BlockConfig = Record<string, unknown>;

const inputCls =
  'w-full rounded-lg border border-app bg-app-card px-3 py-2 text-sm text-app-fg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none';

export function BlockConfigModal({
  nodeId,
  data,
  config,
  onSave,
  onClose,
}: {
  nodeId: string;
  data: BlockNodeData;
  config: BlockConfig;
  onSave: (config: BlockConfig) => void;
  onClose: () => void;
}) {
  const block = getBlockById(data.blockId as BlockId);
  const [values, setValues] = useState<BlockConfig>(() => ({ ...config }));
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const isTextToSpeech = block?.id === 'text-to-speech';

  useEffect(() => {
    if (isTextToSpeech) {
      getElevenLabsVoices().then(setVoices).catch(() => setVoices([]));
    }
  }, [isTextToSpeech]);

  if (!block) return null;

  // Exclude audioBase64 for speech-to-text (use Record in Run panel or connect from upstream)
  const configurableInputs =
    block.inputs?.filter((i) => i.type === 'text' && !(block.id === 'speech-to-text' && i.key === 'audioBase64')) ?? [];

  const handleSave = () => {
    onSave(values);
    onClose();
  };

  const isVoiceInput = (input: { key: string }) => isTextToSpeech && input.key === 'voiceId';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-app bg-app-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-app px-4 py-3">
          <h3 className="text-sm font-semibold text-app-fg">Configure: {data.label}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-app-soft hover:bg-app-card"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          {configurableInputs.length === 0 && (
            <p className="text-sm text-app-soft">No configurable fields for this block.</p>
          )}
          {configurableInputs.map((input) => {
            const showVoiceDropdown = isVoiceInput(input);
            return (
              <div key={input.key}>
                <label className="mb-1 block text-xs font-medium text-app-soft">
                  {input.label}
                </label>
                {showVoiceDropdown ? (
                  <select
                    className={inputCls}
                    value={String(values[input.key] ?? '')}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [input.key]: e.target.value }))
                    }
                  >
                    <option value="">Default voice</option>
                    {voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={inputCls}
                    value={String(values[input.key] ?? '')}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [input.key]: e.target.value }))
                    }
                    placeholder={input.label}
                  />
                )}
                <p className="mt-0.5 text-[10px] text-app-soft">
                  {showVoiceDropdown
                    ? 'Select an ElevenLabs voice. Leave as Default for the API default.'
                    : 'Leave blank to use connected upstream value at run time.'}
                </p>
              </div>
            );
          })}
        </div>
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
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

import { create } from 'zustand';

const DEBUG_AUDIO = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

/**
 * Stores the last run output per node, keyed by node id then output key.
 * Used to resolve "connected" inputs when running a downstream block or the whole workflow.
 * Preserves audioBase64 and other large values without truncation.
 */
export type FlowRunState = {
  /** nodeId -> { outputKey: value } from last run */
  outputsByNode: Record<string, Record<string, unknown>>;
  setNodeOutput: (nodeId: string, outputs: Record<string, unknown>) => void;
  getOutput: (nodeId: string, outputKey: string) => unknown;
  clearNode: (nodeId: string) => void;
  clearAll: () => void;
};

export const useFlowRunStore = create<FlowRunState>((set, get) => ({
  outputsByNode: {},

  setNodeOutput: (nodeId, outputs) => {
    if (DEBUG_AUDIO && outputs?.audioBase64) {
      console.log('[flowRunStore] setNodeOutput: audioBase64 preserved', { nodeId, len: String(outputs.audioBase64).length });
    }
    return set((state) => ({
      outputsByNode: {
        ...state.outputsByNode,
        [nodeId]: { ...outputs },
      },
    }));
  },

  getOutput: (nodeId, outputKey) => {
    const nodeOut = get().outputsByNode[nodeId];
    if (!nodeOut) return undefined;
    const v = nodeOut[outputKey];
    return v;
  },

  clearNode: (nodeId) =>
    set((state) => {
      const next = { ...state.outputsByNode };
      delete next[nodeId];
      return { outputsByNode: next };
    }),

  clearAll: () => set({ outputsByNode: {} }),
}));

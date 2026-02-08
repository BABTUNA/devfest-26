import { create } from 'zustand';

export type LogEntry = {
  id: string;
  blockName: string;
  blockId: string;
  at: number;
  success: boolean;
  error?: string;
  output?: Record<string, unknown>;
};

type ExecutionLogState = {
  entries: LogEntry[];
  maxEntries: number;
  isVisible: boolean;
  add: (entry: Omit<LogEntry, 'id' | 'at'>) => void;
  setVisible: (visible: boolean) => void;
  clear: () => void;
};

export const useExecutionLog = create<ExecutionLogState>((set) => ({
  entries: [],
  maxEntries: 50,
  isVisible: false,

  add: (entry) =>
    set((state) => ({
      isVisible: true,
      entries: [
        {
          ...entry,
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          at: Date.now(),
        },
        ...state.entries,
      ].slice(0, state.maxEntries),
    })),

  setVisible: (visible: boolean) => set({ isVisible: visible }),
  clear: () => set({ entries: [] }),
}));

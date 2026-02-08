import { create } from 'zustand';
import type { Edge, Node } from '@xyflow/react';

export interface SavedAgent {
  id: string;
  name: string;
  /** Snapshot of nodes at save time (positions are stored relative to the top-left of the group) */
  nodes: Node[];
  /** Snapshot of edges */
  edges: Edge[];
  createdAt: string;
}

const STORAGE_KEY = 'devfest-saved-agents';

function loadAgents(): SavedAgent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAgent[]) : [];
  } catch {
    return [];
  }
}

function persistAgents(agents: SavedAgent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

export type AgentStoreState = {
  agents: SavedAgent[];
  hydrated: boolean;
  hydrate: () => void;
  addAgent: (agent: SavedAgent) => void;
  removeAgent: (id: string) => void;
};

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  agents: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ agents: loadAgents(), hydrated: true });
  },

  addAgent: (agent) => {
    const next = [...get().agents, agent];
    persistAgents(next);
    set({ agents: next });
  },

  removeAgent: (id) => {
    const next = get().agents.filter((a) => a.id !== id);
    persistAgents(next);
    set({ agents: next });
  },
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BlockId } from 'shared';

type CartState = {
  blockIds: BlockId[];
  addBlock: (blockId: BlockId) => void;
  removeBlock: (blockId: BlockId) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      blockIds: [],
      addBlock: (blockId) =>
        set((state) => ({
          blockIds: state.blockIds.includes(blockId) ? state.blockIds : [...state.blockIds, blockId],
        })),
      removeBlock: (blockId) =>
        set((state) => {
          if (!state.blockIds.includes(blockId)) return state;
          return {
            blockIds: state.blockIds.filter((id) => id !== blockId),
          };
        }),
      clear: () => set({ blockIds: [] }),
    }),
    {
      name: 'marketplace-cart',
    }
  )
);

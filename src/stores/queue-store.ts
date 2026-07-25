import { create } from 'zustand';
import type { QueueItem } from '@/types/domain';

interface QueueState {
  items: QueueItem[];
  setItems: (items: QueueItem[]) => void;
  updateItem: (id: string, patch: Partial<QueueItem>) => void;
  reset: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  setItems: (items) => set({ items }),
  updateItem: (id, patch) => {
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  },
  reset: () => set({ items: [] }),
}));

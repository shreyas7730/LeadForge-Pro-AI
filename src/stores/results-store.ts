import { create } from 'zustand';
import type { Business } from '@/types/domain';

interface ResultsState {
  items: Business[];
  selectedIds: Set<string>;
  totalCount: number;
  setItems: (items: Business[]) => void;
  upsert: (business: Business) => void;
  setTotalCount: (n: number) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  reset: () => void;
}

export const useResultsStore = create<ResultsState>((set, get) => ({
  items: [],
  selectedIds: new Set(),
  totalCount: 0,

  setItems: (items) => set({ items }),

  upsert: (business) => {
    const items = get().items;
    const idx = items.findIndex((b) => b.id === business.id);
    if (idx >= 0) {
      const next = [...items];
      next[idx] = business;
      set({ items: next });
    } else {
      set({ items: [business, ...items] });
    }
  },

  setTotalCount: (n) => set({ totalCount: n }),

  select: (id) => {
    const next = new Set(get().selectedIds);
    next.add(id);
    set({ selectedIds: next });
  },

  deselect: (id) => {
    const next = new Set(get().selectedIds);
    next.delete(id);
    set({ selectedIds: next });
  },

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set() }),

  reset: () =>
    set({
      items: [],
      selectedIds: new Set(),
      totalCount: 0,
    }),
}));

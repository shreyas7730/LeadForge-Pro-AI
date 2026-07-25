import { create } from 'zustand';
import type { AnalyticsSnapshot } from '@/types/domain';

interface AnalyticsState {
  snapshots: AnalyticsSnapshot[];
  totals: {
    businesses: number;
    sessions: number;
    emails: number;
  };
  setSnapshots: (snapshots: AnalyticsSnapshot[]) => void;
  setTotals: (totals: AnalyticsState['totals']) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  snapshots: [],
  totals: { businesses: 0, sessions: 0, emails: 0 },
  setSnapshots: (snapshots) => set({ snapshots }),
  setTotals: (totals) => set({ totals }),
}));

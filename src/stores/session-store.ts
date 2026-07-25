import { create } from 'zustand';
import type {
  ExtractionSession,
  ExtractionTask,
  SessionStatus,
} from '@/types/domain';

interface SessionState {
  activeSession: ExtractionSession | null;
  tasks: ExtractionTask[];
  status: SessionStatus;
  setActiveSession: (session: ExtractionSession | null) => void;
  setTasks: (tasks: ExtractionTask[]) => void;
  updateTask: (taskId: string, patch: Partial<ExtractionTask>) => void;
  setStatus: (status: SessionStatus) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  tasks: [],
  status: 'idle',

  setActiveSession: (session) =>
    set({
      activeSession: session,
      status: session?.status ?? 'idle',
    }),

  setTasks: (tasks) => set({ tasks }),

  updateTask: (taskId, patch) => {
    set({
      tasks: get().tasks.map((t) =>
        t.id === taskId ? { ...t, ...patch } : t
      ),
    });
  },

  setStatus: (status) => {
    const session = get().activeSession;
    set({
      status,
      activeSession: session ? { ...session, status } : null,
    });
  },

  reset: () =>
    set({
      activeSession: null,
      tasks: [],
      status: 'idle',
    }),
}));

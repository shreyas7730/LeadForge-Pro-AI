import type { ExtractionSession, ExtractionTask } from '@/types/domain';
import { getDatabase } from '@/database';

export const sessionRepository = {
  async saveSession(session: ExtractionSession): Promise<void> {
    await getDatabase().sessions.put(session);
  },

  async getSession(id: string): Promise<ExtractionSession | undefined> {
    return getDatabase().sessions.get(id);
  },

  async getActiveSession(): Promise<ExtractionSession | undefined> {
    const running = await getDatabase()
      .sessions.where('status')
      .anyOf(['running', 'paused'])
      .first();
    return running;
  },

  async listSessions(limit = 50): Promise<ExtractionSession[]> {
    return getDatabase()
      .sessions.orderBy('startedAt')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async saveTask(task: ExtractionTask): Promise<void> {
    await getDatabase().tasks.put(task);
  },

  async saveTasks(tasks: ExtractionTask[]): Promise<void> {
    if (tasks.length === 0) return;
    await getDatabase().tasks.bulkPut(tasks);
  },

  async getTasksForSession(sessionId: string): Promise<ExtractionTask[]> {
    return getDatabase().tasks.where('sessionId').equals(sessionId).toArray();
  },

  async getTask(id: string): Promise<ExtractionTask | undefined> {
    return getDatabase().tasks.get(id);
  },
};

/**
 * QueueService — task queue state machine (infrastructure only).
 * No Google extraction. Phase 2 prepares the API for Phase 3.
 */

import type {
  ExtractionSession,
  ExtractionSettings,
  ExtractionTask,
  QueueItem,
  TaskStatus,
} from '@/types/domain';
import { DEFAULT_EXTRACTION_SETTINGS } from '@/types/domain';
import { generateUUID } from '@/utils/id';
import { sessionRepository } from '@/repositories';
import { getDatabase } from '@/database';
import { logger } from '@/services/logger-service';
import { AppError } from '@/utils/errors';

function buildQuery(keyword: string, location: string): string {
  const k = keyword.trim();
  const l = location.trim();
  if (k && l) return `${k} in ${l}`;
  return k || l;
}

export const queueService = {
  /**
   * Create a session + tasks from keyword × location matrix.
   * Does not start extraction — Phase 3 will drive that.
   */
  async createSession(input: {
    keywords: string[];
    locations: string[];
    settings?: Partial<ExtractionSettings>;
    name?: string;
  }): Promise<{ session: ExtractionSession; tasks: ExtractionTask[] }> {
    const keywords = input.keywords.map((k) => k.trim()).filter(Boolean);
    const locations = input.locations.map((l) => l.trim()).filter(Boolean);

    if (keywords.length === 0) {
      throw new AppError('VALIDATION', 'At least one keyword is required');
    }
    if (locations.length === 0) {
      throw new AppError('VALIDATION', 'At least one location is required');
    }

    const sessionId = generateUUID();
    const settings: ExtractionSettings = {
      ...DEFAULT_EXTRACTION_SETTINGS,
      ...input.settings,
    };

    const tasks: ExtractionTask[] = [];
    let priority = 0;
    for (const keyword of keywords) {
      for (const location of locations) {
        const task: ExtractionTask = {
          id: generateUUID(),
          sessionId,
          keyword,
          location,
          query: buildQuery(keyword, location),
          status: 'pending',
          priority: priority++,
          progress: 0,
          businessesFound: 0,
          emailsFound: 0,
          pagesProcessed: 0,
          pageStart: 0,
          retryCount: 0,
          maxRetries: settings.retryCount,
          createdAt: Date.now(),
        };
        tasks.push(task);
      }
    }

    const session: ExtractionSession = {
      id: sessionId,
      name: input.name,
      taskIds: tasks.map((t) => t.id),
      status: 'idle',
      startedAt: Date.now(),
      totalBusinesses: 0,
      totalEmails: 0,
      settingsSnapshot: settings,
    };

    await sessionRepository.saveSession(session);
    await sessionRepository.saveTasks(tasks);

    const queueItems: QueueItem[] = tasks.map((t) => ({
      id: generateUUID(),
      taskId: t.id,
      sessionId,
      status: t.status,
      priority: t.priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    await getDatabase().queue.bulkPut(queueItems);

    logger.info('Session created', {
      category: 'queue',
      sessionId,
      context: { taskCount: tasks.length },
    });

    return { session, tasks };
  },

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    patch?: Partial<ExtractionTask>
  ): Promise<void> {
    const task = await sessionRepository.getTask(taskId);
    if (!task) {
      throw new AppError('NOT_FOUND', `Task ${taskId} not found`);
    }
    await sessionRepository.saveTask({
      ...task,
      ...patch,
      status,
    });

    const queueRows = await getDatabase()
      .queue.where('taskId')
      .equals(taskId)
      .toArray();
    for (const row of queueRows) {
      await getDatabase().queue.put({
        ...row,
        status,
        updatedAt: Date.now(),
      });
    }
  },

  async getQueue(sessionId?: string): Promise<QueueItem[]> {
    if (sessionId) {
      return getDatabase()
        .queue.where('sessionId')
        .equals(sessionId)
        .sortBy('priority');
    }
    return getDatabase().queue.orderBy('priority').toArray();
  },

  async getSessionWithTasks(
    sessionId: string
  ): Promise<{ session: ExtractionSession; tasks: ExtractionTask[] } | null> {
    const session = await sessionRepository.getSession(sessionId);
    if (!session) return null;
    const tasks = await sessionRepository.getTasksForSession(sessionId);
    return { session, tasks };
  },
};

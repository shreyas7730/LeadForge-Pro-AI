/**
 * Dexie database schema — Phase 2.
 * Versioned, migration-ready.
 */

import Dexie, { type Table } from 'dexie';
import type {
  AnalyticsSnapshot,
  AppNotification,
  Business,
  ExportJob,
  ExtractionSession,
  ExtractionTask,
  LogEntry,
  QueueItem,
  RecentSearch,
} from '@/types/domain';
import { DB_NAME, DB_VERSION } from '@/constants';

export class LeadForgeDatabase extends Dexie {
  businesses!: Table<Business, string>;
  tasks!: Table<ExtractionTask, string>;
  sessions!: Table<ExtractionSession, string>;
  queue!: Table<QueueItem, string>;
  exportHistory!: Table<ExportJob, string>;
  analytics!: Table<AnalyticsSnapshot, string>;
  logs!: Table<LogEntry, string>;
  notifications!: Table<AppNotification, string>;
  recentSearches!: Table<RecentSearch, string>;

  constructor() {
    super(DB_NAME);

    this.version(DB_VERSION).stores({
      businesses:
        'id, identityKey, cid, status, extractedAt, keyword, location, companyName, sessionId, [keyword+location]',
      tasks: 'id, sessionId, status, priority, createdAt',
      sessions: 'id, status, startedAt',
      queue: 'id, taskId, sessionId, status, priority, createdAt',
      exportHistory: 'id, createdAt, format, status',
      analytics: 'id, sessionId, date, createdAt',
      logs: 'id, timestamp, level, category, sessionId',
      notifications: 'id, createdAt, type, read',
      recentSearches: 'id, createdAt, query',
    });
  }
}

let dbInstance: LeadForgeDatabase | null = null;

export function getDatabase(): LeadForgeDatabase {
  if (!dbInstance) {
    dbInstance = new LeadForgeDatabase();
  }
  return dbInstance;
}

export async function openDatabase(): Promise<LeadForgeDatabase> {
  const db = getDatabase();
  if (!db.isOpen()) {
    await db.open();
  }
  return db;
}

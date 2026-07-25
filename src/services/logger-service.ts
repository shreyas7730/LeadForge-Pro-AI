/**
 * LoggerService — structured logging with local persistence.
 * Phase 2.
 */

import type { LogEntry, LogLevel } from '@/types/domain';
import { generateUUID } from '@/utils/id';
import { LIMITS } from '@/constants';
import { getDatabase } from '@/database';

export type LogCategory =
  | 'system'
  | 'messaging'
  | 'storage'
  | 'window'
  | 'queue'
  | 'parser'
  | 'crawler'
  | 'export'
  | 'ui';

interface LogOptions {
  category?: LogCategory | string;
  correlationId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;
  stack?: string;
}

class LoggerService {
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly flushIntervalMs = 2000;

  private createEntry(
    level: LogLevel,
    message: string,
    options?: LogOptions
  ): LogEntry {
    return {
      id: generateUUID(),
      timestamp: Date.now(),
      level,
      category: options?.category ?? 'system',
      message,
      correlationId: options?.correlationId,
      sessionId: options?.sessionId,
      stack: options?.stack,
      context: options?.context,
    };
  }

  private enqueue(entry: LogEntry): void {
    this.buffer.push(entry);
    // Also emit to console in development-style always for Phase 2 visibility
    const prefix = `[${entry.level.toUpperCase()}][${entry.category}]`;
    if (entry.level === 'error' || entry.level === 'fatal') {
      console.error(prefix, entry.message, entry.context ?? '');
    } else if (entry.level === 'warn') {
      console.warn(prefix, entry.message, entry.context ?? '');
    } else if (entry.level === 'debug') {
      console.debug(prefix, entry.message, entry.context ?? '');
    } else {
      console.info(prefix, entry.message, entry.context ?? '');
    }
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, this.flushIntervalMs);
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      const db = getDatabase();
      await db.logs.bulkAdd(batch);
      // Prune old logs
      const count = await db.logs.count();
      if (count > LIMITS.maxLogEntries) {
        const excess = count - LIMITS.maxLogEntries;
        const old = await db.logs.orderBy('timestamp').limit(excess).primaryKeys();
        await db.logs.bulkDelete(old);
      }
    } catch (err) {
      // Re-queue on failure so we don't lose logs silently
      this.buffer.unshift(...batch);
      console.error('[Logger] flush failed', err);
    }
  }

  debug(message: string, options?: LogOptions): void {
    this.enqueue(this.createEntry('debug', message, options));
  }

  info(message: string, options?: LogOptions): void {
    this.enqueue(this.createEntry('info', message, options));
  }

  warn(message: string, options?: LogOptions): void {
    this.enqueue(this.createEntry('warn', message, options));
  }

  error(message: string, options?: LogOptions): void {
    this.enqueue(this.createEntry('error', message, options));
  }

  fatal(message: string, options?: LogOptions): void {
    this.enqueue(this.createEntry('fatal', message, options));
  }

  async getRecent(limit = 200): Promise<LogEntry[]> {
    const db = getDatabase();
    return db.logs.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  async clear(): Promise<void> {
    const db = getDatabase();
    await db.logs.clear();
    this.buffer = [];
  }
}

export const logger = new LoggerService();

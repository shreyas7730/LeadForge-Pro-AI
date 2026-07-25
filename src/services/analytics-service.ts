/**
 * AnalyticsService — aggregations from IndexedDB.
 * Phase 2 infrastructure; richer charts in Phase 7.
 */

import type { AnalyticsSnapshot } from '@/types/domain';
import { generateUUID } from '@/utils/id';
import { toDateKey } from '@/utils/date';
import { getDatabase } from '@/database';

export const analyticsService = {
  async recordSnapshot(
    partial: Omit<AnalyticsSnapshot, 'id' | 'createdAt' | 'date'> & {
      date?: string;
    }
  ): Promise<AnalyticsSnapshot> {
    const snapshot: AnalyticsSnapshot = {
      id: generateUUID(),
      date: partial.date ?? toDateKey(),
      sessionId: partial.sessionId,
      businessesFound: partial.businessesFound,
      businessesProcessed: partial.businessesProcessed,
      emailsFound: partial.emailsFound,
      websitesCrawled: partial.websitesCrawled,
      successRate: partial.successRate,
      avgSpeedPerMinute: partial.avgSpeedPerMinute,
      createdAt: Date.now(),
    };
    await getDatabase().analytics.put(snapshot);
    return snapshot;
  },

  async getRecent(limit = 30): Promise<AnalyticsSnapshot[]> {
    return getDatabase()
      .analytics.orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getTotals(): Promise<{
    businesses: number;
    sessions: number;
    emails: number;
  }> {
    const db = getDatabase();
    const businesses = await db.businesses.count();
    const sessions = await db.sessions.count();
    const all = await db.businesses.toArray();
    const emails = all.reduce((sum, b) => sum + (b.emails?.length ?? 0), 0);
    return { businesses, sessions, emails };
  },
};

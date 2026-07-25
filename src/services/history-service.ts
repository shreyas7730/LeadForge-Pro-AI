/**
 * HistoryService — recent searches & session history.
 * Phase 2.
 */

import type { RecentSearch } from '@/types/domain';
import { generateUUID } from '@/utils/id';
import { LIMITS } from '@/constants';
import { getDatabase } from '@/database';
import { sessionRepository } from '@/repositories';

export const historyService = {
  async addSearch(keyword: string, location: string): Promise<RecentSearch> {
    const entry: RecentSearch = {
      id: generateUUID(),
      keyword: keyword.trim(),
      location: location.trim(),
      query: [keyword.trim(), location.trim()].filter(Boolean).join(' in '),
      createdAt: Date.now(),
    };
    await getDatabase().recentSearches.put(entry);

    const count = await getDatabase().recentSearches.count();
    if (count > LIMITS.maxRecentSearches) {
      const excess = count - LIMITS.maxRecentSearches;
      const old = await getDatabase()
        .recentSearches.orderBy('createdAt')
        .limit(excess)
        .primaryKeys();
      await getDatabase().recentSearches.bulkDelete(old);
    }

    return entry;
  },

  async getRecentSearches(limit = 20): Promise<RecentSearch[]> {
    return getDatabase()
      .recentSearches.orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getSessionHistory(limit = 30) {
    return sessionRepository.listSessions(limit);
  },
};

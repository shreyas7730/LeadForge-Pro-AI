import type { Business } from '@/types/domain';
import { getDatabase } from '@/database';

export const businessRepository = {
  async upsert(business: Business): Promise<void> {
    await getDatabase().businesses.put(business);
  },

  async upsertMany(items: Business[]): Promise<void> {
    if (items.length === 0) return;
    await getDatabase().businesses.bulkPut(items);
  },

  async getById(id: string): Promise<Business | undefined> {
    return getDatabase().businesses.get(id);
  },

  async getByIdentityKey(key: string): Promise<Business | undefined> {
    return getDatabase().businesses.where('identityKey').equals(key).first();
  },

  async list(limit = 1000, offset = 0): Promise<Business[]> {
    return getDatabase()
      .businesses.orderBy('extractedAt')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  },

  async count(): Promise<number> {
    return getDatabase().businesses.count();
  },

  async deleteById(id: string): Promise<void> {
    await getDatabase().businesses.delete(id);
  },

  async clear(): Promise<void> {
    await getDatabase().businesses.clear();
  },
};

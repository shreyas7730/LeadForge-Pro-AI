/**
 * ExtractionService — facade used by UI / messaging.
 * Delegates to ExtractionEngine (Phase 3).
 */

import type { ExtractionSession, ExtractionSettings } from '@/types/domain';
import { extractionEngine } from '@/services/extraction-engine';

export const extractionService = {
  async start(input: {
    keywords: string[];
    locations: string[];
    settings?: Partial<ExtractionSettings>;
    name?: string;
  }): Promise<{ sessionId: string }> {
    return extractionEngine.start(input);
  },

  async pause(sessionId: string): Promise<void> {
    return extractionEngine.pause(sessionId);
  },

  async resume(sessionId: string): Promise<void> {
    return extractionEngine.resume(sessionId);
  },

  async cancel(sessionId: string): Promise<void> {
    return extractionEngine.cancel(sessionId);
  },

  async getActiveSession(): Promise<ExtractionSession | null> {
    return extractionEngine.getState().session;
  },

  async recover(): Promise<{ sessionId: string } | null> {
    return extractionEngine.recover();
  },
};

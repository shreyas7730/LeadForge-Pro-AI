/**
 * ExtractionService — STUB for Phase 2.
 * Real Google extraction arrives in Phase 3.
 */

import type { ExtractionSession } from '@/types/domain';
import { AppError } from '@/utils/errors';
import { logger } from '@/services/logger-service';

export const extractionService = {
  /**
   * Placeholder. Phase 3 will open Google tabs and drive the parser.
   */
  async start(_sessionId: string): Promise<void> {
    logger.warn('extractionService.start called before Phase 3 implementation', {
      category: 'system',
    });
    throw new AppError(
      'UNKNOWN',
      'Extraction engine is not available until Phase 3',
      { recoverable: false }
    );
  },

  async pause(_sessionId: string): Promise<void> {
    throw new AppError(
      'UNKNOWN',
      'Extraction engine is not available until Phase 3',
      { recoverable: false }
    );
  },

  async resume(_sessionId: string): Promise<void> {
    throw new AppError(
      'UNKNOWN',
      'Extraction engine is not available until Phase 3',
      { recoverable: false }
    );
  },

  async cancel(_sessionId: string): Promise<void> {
    throw new AppError(
      'UNKNOWN',
      'Extraction engine is not available until Phase 3',
      { recoverable: false }
    );
  },

  async getActiveSession(): Promise<ExtractionSession | null> {
    return null;
  },
};

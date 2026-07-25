/** Lightweight validation helpers — Phase 2 */

import { z } from 'zod';

export const themeModeSchema = z.enum(['dark', 'light', 'system']);

export const windowBoundsSchema = z.object({
  width: z.number().min(1024),
  height: z.number().min(680),
  left: z.number(),
  top: z.number(),
});

export const extractionSettingsSchema = z.object({
  delayBetweenPagesSec: z.number().min(0).max(120),
  maxTimePerWebsiteSec: z.number().min(1).max(120),
  maxCrawlDepth: z.number().int().min(0).max(10),
  maxBusinessesPerQuery: z.number().int().min(0),
  retryCount: z.number().int().min(0).max(10),
  requestTimeoutMs: z.number().int().min(1000).max(60_000),
  emailExclusionRegexes: z.array(z.string()),
  duplicateStrategy: z.enum([
    'cid-preferred',
    'composite',
    'strict-name-address',
  ]),
  autoCrawlEmails: z.boolean(),
});

export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

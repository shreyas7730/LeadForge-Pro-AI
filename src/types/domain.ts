/**
 * Core domain types — Phase 2.
 * Used by storage, queue, results, and future extraction engine.
 */

export type BusinessStatus =
  | 'discovered'
  | 'crawling'
  | 'crawled'
  | 'failed'
  | 'duplicate';

export type CrawlStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface SocialLinks {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  pinterest?: string;
  telegram?: string;
  whatsapp?: string;
}

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SessionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Business {
  id: string;
  identityKey: string;
  cid?: string;
  companyName: string;
  category?: string;
  phone?: string;
  phones: string[];
  emails: string[];
  emailCount: number;
  website?: string;
  websiteName?: string;
  websiteTitle?: string;
  metaDescription?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  googleUrl?: string;
  mapsUrl?: string;
  snippet?: string;
  openStatus?: string;
  hours?: string;
  socialLinks: SocialLinks;
  crawlStatus: CrawlStatus;
  crawlTime?: number;
  lastVisited?: number;
  crawlError?: string;
  keyword: string;
  location: string;
  sourceQuery: string;
  status: BusinessStatus;
  tags: string[];
  notes?: string;
  extractedAt: number;
  crawledAt?: number;
  lastUpdatedAt: number;
  source: 'google-local';
  sessionId?: string;
  /** Last completed Google results start offset (for pagination resume). */
  lastPageStart?: number;
  metadata?: Record<string, unknown>;
}

export interface ExtractionTask {
  id: string;
  sessionId: string;
  keyword: string;
  location: string;
  query: string;
  status: TaskStatus;
  priority: number;
  progress: number;
  businessesFound: number;
  emailsFound: number;
  pagesProcessed: number;
  /** Google `start` pagination offset for resume. */
  pageStart: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
}

export interface ExtractionSettings {
  delayBetweenPagesSec: number;
  maxTimePerWebsiteSec: number;
  maxCrawlDepth: number;
  maxBusinessesPerQuery: number;
  retryCount: number;
  requestTimeoutMs: number;
  emailExclusionRegexes: string[];
  duplicateStrategy: 'cid-preferred' | 'composite' | 'strict-name-address';
  autoCrawlEmails: boolean;
}

export interface ExtractionSession {
  id: string;
  name?: string;
  taskIds: string[];
  status: SessionStatus;
  startedAt: number;
  endedAt?: number;
  totalBusinesses: number;
  totalEmails: number;
  settingsSnapshot: ExtractionSettings;
}

export interface QueueItem {
  id: string;
  taskId: string;
  sessionId: string;
  status: TaskStatus;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface ExportJob {
  id: string;
  format: ExportFormat;
  columns: string[];
  rowCount: number;
  fileName: string;
  sizeBytes: number;
  createdAt: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface AnalyticsSnapshot {
  id: string;
  sessionId?: string;
  date: string;
  businessesFound: number;
  businessesProcessed: number;
  emailsFound: number;
  websitesCrawled: number;
  successRate: number;
  avgSpeedPerMinute: number;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  correlationId?: string;
  sessionId?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  createdAt: number;
  read: boolean;
  durationMs?: number;
  actionLabel?: string;
  actionHref?: string;
}

export interface RecentSearch {
  id: string;
  keyword: string;
  location: string;
  query: string;
  createdAt: number;
}

export const DEFAULT_EXTRACTION_SETTINGS: ExtractionSettings = {
  delayBetweenPagesSec: 8,
  maxTimePerWebsiteSec: 12,
  maxCrawlDepth: 2,
  maxBusinessesPerQuery: 0,
  retryCount: 2,
  requestTimeoutMs: 8000,
  emailExclusionRegexes: [],
  duplicateStrategy: 'cid-preferred',
  autoCrawlEmails: true,
};

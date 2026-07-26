/**
 * Typed messaging protocol — Phase 2 + Phase 3 extensions.
 */

import type {
  Business,
  ExtractionSession,
  ExtractionSettings,
  ExtractionTask,
  LogEntry,
  SessionStatus,
  TaskStatus,
} from './domain';
import type { ThemeMode } from './settings';

export type MessageType =
  | 'WINDOW_READY'
  | 'WINDOW_ACK'
  | 'GET_STATE'
  | 'STATE_SNAPSHOT'
  | 'START_SESSION'
  | 'PAUSE_SESSION'
  | 'RESUME_SESSION'
  | 'CANCEL_SESSION'
  | 'TASK_PROGRESS'
  | 'BUSINESS_UPSERT'
  | 'SESSION_STATUS'
  | 'EXPORT_REQUEST'
  | 'EXPORT_PROGRESS'
  | 'EXPORT_COMPLETE'
  | 'LOG_ENTRY'
  | 'PING'
  | 'PONG'
  | 'ERROR'
  // Phase 3 — content script bridge
  | 'PARSE_PAGE'
  | 'PARSE_RESULT'
  | 'CONTENT_READY';

export interface MessageEnvelope<T extends MessageType = MessageType> {
  type: T;
  correlationId: string;
  timestamp: number;
  traceId?: string;
  payload: MessagePayloadMap[T];
}

/** Raw candidate from content-script parsers (pre-normalization). */
export interface ParsedCandidate {
  companyName: string;
  cid?: string;
  category?: string;
  phone?: string;
  website?: string;
  websiteName?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  googleUrl?: string;
  mapsUrl?: string;
  snippet?: string;
  openStatus?: string;
  hours?: string;
  sourceBlock: 'local-card' | 'organic' | 'knowledge-panel';
}

export interface MessagePayloadMap {
  WINDOW_READY: { version: string };
  WINDOW_ACK: { ok: true };
  GET_STATE: Record<string, never>;
  STATE_SNAPSHOT: {
    session: ExtractionSession | null;
    tasks: ExtractionTask[];
    theme: ThemeMode;
  };
  START_SESSION: {
    keywords: string[];
    locations: string[];
    settings?: Partial<ExtractionSettings>;
    name?: string;
  };
  PAUSE_SESSION: { sessionId: string };
  RESUME_SESSION: { sessionId: string };
  CANCEL_SESSION: { sessionId: string };
  TASK_PROGRESS: {
    taskId: string;
    sessionId: string;
    status: TaskStatus;
    progress: number;
    businessesFound: number;
    emailsFound: number;
    pagesProcessed?: number;
    currentQuery?: string;
    currentPage?: number;
    error?: string;
  };
  BUSINESS_UPSERT: { business: Business };
  SESSION_STATUS: {
    sessionId: string;
    status: SessionStatus;
    totalBusinesses: number;
    totalEmails: number;
    tasksCompleted?: number;
    tasksTotal?: number;
  };
  EXPORT_REQUEST: {
    format: 'csv' | 'xlsx' | 'json';
    columns: string[];
    businessIds?: string[];
  };
  EXPORT_PROGRESS: { jobId: string; percent: number };
  EXPORT_COMPLETE: {
    jobId: string;
    fileName: string;
    rowCount: number;
    sizeBytes: number;
  };
  LOG_ENTRY: { entry: LogEntry };
  PING: Record<string, never>;
  PONG: { ok: true };
  ERROR: {
    code: string;
    message: string;
    details?: unknown;
  };
  PARSE_PAGE: {
    taskId: string;
    sessionId: string;
    query: string;
    keyword: string;
    location: string;
  };
  PARSE_RESULT: {
    taskId: string;
    sessionId: string;
    candidates: ParsedCandidate[];
    hasNextPage: boolean;
    nextStart: number;
    pageStart: number;
    error?: string;
  };
  CONTENT_READY: { url: string };
}

export type AnyMessage = {
  [K in MessageType]: MessageEnvelope<K>;
}[MessageType];

export interface MessageError {
  code: string;
  message: string;
  details?: unknown;
}

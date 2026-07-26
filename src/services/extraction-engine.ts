/**
 * ExtractionEngine — Google Search discovery orchestrator (Phase 3).
 * No website crawling / email extraction.
 */

import type {
  Business,
  ExtractionSession,
  ExtractionSettings,
  ExtractionTask,
  TaskStatus,
} from '@/types/domain';
import { DEFAULT_EXTRACTION_SETTINGS } from '@/types/domain';
import type { MessageEnvelope, ParsedCandidate } from '@/types/messages';
import { queueService } from '@/services/queue-service';
import { sessionRepository } from '@/repositories';
import { businessRepository } from '@/repositories';
import { tabManager } from '@/services/tab-manager';
import { analyticsService } from '@/services/analytics-service';
import { crawlerService } from '@/services/crawler-service';
import { logger } from '@/services/logger-service';
import { broadcastMessage, createMessage } from '@/messaging';
import { generateUUID } from '@/utils/id';
import { buildIdentityKey } from '@/utils/string';
import { sleep } from '@/utils/async';
import { AppError } from '@/utils/errors';

type EngineState = {
  session: ExtractionSession | null;
  tasks: ExtractionTask[];
  running: boolean;
  paused: boolean;
  cancelled: boolean;
  abort: AbortController | null;
};

const state: EngineState = {
  session: null,
  tasks: [],
  running: false,
  paused: false,
  cancelled: false,
  abort: null,
};

function emitProgress(task: ExtractionTask): void {
  broadcastMessage('TASK_PROGRESS', {
    taskId: task.id,
    sessionId: task.sessionId,
    status: task.status,
    progress: task.progress,
    businessesFound: task.businessesFound,
    emailsFound: task.emailsFound,
    pagesProcessed: task.pagesProcessed,
    currentQuery: task.query,
    currentPage: Math.floor(task.pageStart / 20) + 1,
    error: task.error,
  });
}

function emitSessionStatus(session: ExtractionSession, tasks: ExtractionTask[]): void {
  const completed = tasks.filter((t) =>
    ['completed', 'failed', 'cancelled'].includes(t.status)
  ).length;
  broadcastMessage('SESSION_STATUS', {
    sessionId: session.id,
    status: session.status,
    totalBusinesses: session.totalBusinesses,
    totalEmails: session.totalEmails,
    tasksCompleted: completed,
    tasksTotal: tasks.length,
  });
}

async function requestParse(
  tabId: number,
  task: ExtractionTask
): Promise<{
  candidates: ParsedCandidate[];
  hasNextPage: boolean;
  nextStart: number;
  pageStart: number;
  error?: string;
}> {
  const envelope = createMessage('PARSE_PAGE', {
    taskId: task.id,
    sessionId: task.sessionId,
    query: task.query,
    keyword: task.keyword,
    location: task.location,
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AppError('TIMEOUT', 'Parse request timed out'));
    }, 20_000);

    chrome.tabs.sendMessage(tabId, envelope, (response: unknown) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(
          new AppError(
            'MESSAGING',
            chrome.runtime.lastError.message ?? 'sendMessage to tab failed'
          )
        );
        return;
      }
      const msg = response as MessageEnvelope<'PARSE_RESULT'> | undefined;
      if (!msg || msg.type !== 'PARSE_RESULT') {
        reject(new AppError('VALIDATION', 'Invalid PARSE_RESULT'));
        return;
      }
      resolve(msg.payload);
    });
  });
}

function candidateToBusiness(
  candidate: ParsedCandidate,
  task: ExtractionTask,
  sessionId: string
): Business {
  const now = Date.now();
  const identityKey = buildIdentityKey({
    cid: candidate.cid,
    keyword: task.keyword,
    location: task.location,
    companyName: candidate.companyName,
    address: candidate.address,
    phone: candidate.phone,
    website: candidate.website,
  });

  return {
    id: generateUUID(),
    identityKey,
    cid: candidate.cid,
    companyName: candidate.companyName,
    category: candidate.category,
    phone: candidate.phone,
    phones: candidate.phone ? [candidate.phone] : [],
    emails: [],
    emailCount: 0,
    website: candidate.website,
    websiteName: candidate.websiteName,
    address: candidate.address,
    rating: candidate.rating,
    reviewCount: candidate.reviewCount,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    googleUrl: candidate.googleUrl,
    mapsUrl: candidate.mapsUrl,
    snippet: candidate.snippet,
    openStatus: candidate.openStatus,
    hours: candidate.hours,
    socialLinks: {},
    crawlStatus: candidate.website ? 'pending' : 'skipped',
    keyword: task.keyword,
    location: task.location,
    sourceQuery: task.query,
    status: 'discovered',
    tags: [],
    extractedAt: now,
    lastUpdatedAt: now,
    source: 'google-local',
    sessionId,
    metadata: { sourceBlock: candidate.sourceBlock },
  };
}

async function upsertBusiness(
  business: Business,
  strategy: ExtractionSettings['duplicateStrategy'],
  autoCrawl: boolean
): Promise<'inserted' | 'duplicate'> {
  const existing = await businessRepository.getByIdentityKey(business.identityKey);
  if (existing) {
    const merged: Business = {
      ...existing,
      phone: existing.phone || business.phone,
      phones:
        (existing.phones && existing.phones.length > 0)
          ? existing.phones
          : (business.phones ?? []),
      website: existing.website || business.website,
      address: existing.address || business.address,
      category: existing.category || business.category,
      rating: existing.rating ?? business.rating,
      reviewCount: existing.reviewCount ?? business.reviewCount,
      mapsUrl: existing.mapsUrl || business.mapsUrl,
      googleUrl: existing.googleUrl || business.googleUrl,
      snippet: existing.snippet || business.snippet,
      openStatus: existing.openStatus || business.openStatus,
      hours: existing.hours || business.hours,
      cid: existing.cid || business.cid,
      emails: existing.emails ?? [],
      emailCount: existing.emailCount ?? existing.emails?.length ?? 0,
      socialLinks: existing.socialLinks ?? {},
      crawlStatus: existing.crawlStatus ?? 'pending',
      lastUpdatedAt: Date.now(),
      status: existing.status,
    };
    void strategy;
    await businessRepository.upsert(merged);
    broadcastMessage('BUSINESS_UPSERT', { business: merged });
    return 'duplicate';
  }

  await businessRepository.upsert(business);
  broadcastMessage('BUSINESS_UPSERT', { business });

  if (autoCrawl && business.website) {
    await crawlerService.enqueue(
      business.id,
      business.website,
      business.sessionId
    );
    // Begin crawling in parallel with remaining search tasks
    void crawlerService.start();
  }

  return 'inserted';
}

async function runTask(
  task: ExtractionTask,
  settings: ExtractionSettings,
  signal: AbortSignal
): Promise<void> {
  const maxBiz =
    settings.maxBusinessesPerQuery > 0
      ? settings.maxBusinessesPerQuery
      : Number.POSITIVE_INFINITY;

  let pageStart = task.pageStart ?? 0;
  let consecutiveEmpty = 0;

  task.status = 'running';
  task.startedAt = task.startedAt ?? Date.now();
  await sessionRepository.saveTask(task);
  emitProgress(task);

  logger.info('Search started', {
    category: 'parser',
    sessionId: task.sessionId,
    context: { query: task.query, pageStart },
  });

  while (!signal.aborted && !state.cancelled) {
    while (state.paused && !state.cancelled && !signal.aborted) {
      await sleep(400);
    }
    if (state.cancelled || signal.aborted) break;

    try {
      const tabId = await tabManager.openSearch(task.query, pageStart);
      const parsed = await requestParse(tabId, task);

      if (parsed.error) {
        logger.warn('Parse error', {
          category: 'parser',
          context: { error: parsed.error, query: task.query },
        });
      }

      let inserted = 0;
      let dupes = 0;
      for (const candidate of parsed.candidates) {
        if (task.businessesFound + inserted >= maxBiz) break;
        const business = candidateToBusiness(
          candidate,
          task,
          task.sessionId
        );
        const result = await upsertBusiness(
          business,
          settings.duplicateStrategy,
          settings.autoCrawlEmails
        );
        if (result === 'inserted') inserted += 1;
        else dupes += 1;
      }

      task.businessesFound += inserted;
      task.pagesProcessed += 1;
      task.pageStart = pageStart;
      task.progress = Math.min(
        99,
        task.pagesProcessed * 10 + (parsed.hasNextPage ? 0 : 5)
      );

      if (state.session) {
        state.session.totalBusinesses += inserted;
        await sessionRepository.saveSession(state.session);
      }

      await sessionRepository.saveTask(task);
      emitProgress(task);
      if (state.session) emitSessionStatus(state.session, state.tasks);

      logger.info('Page parsed', {
        category: 'parser',
        sessionId: task.sessionId,
        context: {
          query: task.query,
          pageStart,
          found: parsed.candidates.length,
          inserted,
          duplicates: dupes,
        },
      });

      if (inserted === 0) consecutiveEmpty += 1;
      else consecutiveEmpty = 0;

      const hitLimit = task.businessesFound >= maxBiz;
      const stopEmpty = consecutiveEmpty >= 2;
      const noNext = !parsed.hasNextPage;

      if (hitLimit || stopEmpty || noNext) {
        break;
      }

      pageStart = parsed.nextStart;
      task.pageStart = pageStart;
      await sessionRepository.saveTask(task);

      // Rate limit between pages
      const delayMs = Math.max(0, settings.delayBetweenPagesSec) * 1000;
      await sleep(delayMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Task page failure', {
        category: 'parser',
        sessionId: task.sessionId,
        context: { query: task.query, error: message },
      });

      task.retryCount += 1;
      if (task.retryCount > task.maxRetries) {
        task.status = 'failed';
        task.error = message;
        task.completedAt = Date.now();
        await sessionRepository.saveTask(task);
        emitProgress(task);
        return;
      }
      await sessionRepository.saveTask(task);
      await sleep(2000);
    }
  }

  if (state.cancelled || signal.aborted) {
    if (task.status === 'running') {
      task.status = state.cancelled ? 'cancelled' : 'paused';
      await sessionRepository.saveTask(task);
      emitProgress(task);
    }
    return;
  }

  task.status = 'completed';
  task.progress = 100;
  task.completedAt = Date.now();
  await sessionRepository.saveTask(task);
  emitProgress(task);

  logger.info('Search completed', {
    category: 'parser',
    sessionId: task.sessionId,
    context: {
      query: task.query,
      businessesFound: task.businessesFound,
      pages: task.pagesProcessed,
    },
  });
}

async function runLoop(): Promise<void> {
  if (!state.session || !state.abort) return;
  const session = state.session;
  const settings = session.settingsSnapshot;
  const signal = state.abort.signal;

  state.running = true;
  session.status = 'running';
  await sessionRepository.saveSession(session);
  emitSessionStatus(session, state.tasks);

  for (const task of state.tasks) {
    if (state.cancelled || signal.aborted) break;
    if (task.status === 'completed' || task.status === 'cancelled') continue;

    // Skip failed beyond retries unless pending/paused/failed with retries left
    if (task.status === 'failed' && task.retryCount > task.maxRetries) continue;

    try {
      await runTask(task, settings, signal);
    } catch (err) {
      task.status = 'failed';
      task.error = err instanceof Error ? err.message : String(err);
      task.completedAt = Date.now();
      await sessionRepository.saveTask(task);
      emitProgress(task);
    }

    // Refresh task list from state
    const idx = state.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) state.tasks[idx] = task;
  }

  if (state.cancelled) {
    session.status = 'cancelled';
  } else if (state.paused) {
    session.status = 'paused';
  } else {
    const anyFailed = state.tasks.some((t) => t.status === 'failed');
    session.status = anyFailed ? 'failed' : 'completed';
  }
  session.endedAt = Date.now();
  await sessionRepository.saveSession(session);
  emitSessionStatus(session, state.tasks);

  state.running = false;
  state.abort = null;

  // Start website crawler for queued businesses (Phase 4)
  if (
    !state.cancelled &&
    session.settingsSnapshot.autoCrawlEmails
  ) {
    void crawlerService.start(
      Math.max(5_000, session.settingsSnapshot.maxTimePerWebsiteSec * 1000)
    );
  }

  void analyticsService.recordSnapshot({
    sessionId: session.id,
    businessesFound: session.totalBusinesses,
    businessesProcessed: session.totalBusinesses,
    emailsFound: 0,
    websitesCrawled: 0,
    successRate:
      state.tasks.length === 0
        ? 0
        : state.tasks.filter((t) => t.status === 'completed').length /
          state.tasks.length,
    avgSpeedPerMinute: 0,
  });

  logger.info('Session finished', {
    category: 'queue',
    sessionId: session.id,
    context: { status: session.status, total: session.totalBusinesses },
  });
}

export const extractionEngine = {
  isRunning(): boolean {
    return state.running;
  },

  getState(): {
    session: ExtractionSession | null;
    tasks: ExtractionTask[];
    running: boolean;
    paused: boolean;
  } {
    return {
      session: state.session,
      tasks: [...state.tasks],
      running: state.running,
      paused: state.paused,
    };
  },

  async start(input: {
    keywords: string[];
    locations: string[];
    settings?: Partial<ExtractionSettings>;
    name?: string;
  }): Promise<{ sessionId: string }> {
    if (state.running) {
      throw new AppError('UNKNOWN', 'An extraction session is already running');
    }

    const { session, tasks } = await queueService.createSession({
      keywords: input.keywords,
      locations: input.locations,
      settings: input.settings,
      name: input.name,
    });

    // Ensure pageStart exists on tasks
    const normalized = tasks.map((t) => ({
      ...t,
      pageStart: t.pageStart ?? 0,
    }));
    await sessionRepository.saveTasks(normalized);

    state.session = { ...session, status: 'running' };
    state.tasks = normalized;
    state.paused = false;
    state.cancelled = false;
    state.abort = new AbortController();

    await sessionRepository.saveSession(state.session);
    logger.info('Extraction session started', {
      category: 'queue',
      sessionId: session.id,
      context: { tasks: normalized.length },
    });

    void runLoop();
    return { sessionId: session.id };
  },

  async pause(sessionId: string): Promise<void> {
    if (!state.session || state.session.id !== sessionId) {
      throw new AppError('NOT_FOUND', 'No matching active session');
    }
    state.paused = true;
    state.session.status = 'paused';
    await sessionRepository.saveSession(state.session);
    for (const t of state.tasks) {
      if (t.status === 'running') {
        t.status = 'paused';
        await sessionRepository.saveTask(t);
        emitProgress(t);
      }
    }
    emitSessionStatus(state.session, state.tasks);
    crawlerService.pause();
    logger.info('Session paused', { category: 'queue', sessionId });
  },

  async resume(sessionId: string): Promise<void> {
    if (!state.session || state.session.id !== sessionId) {
      // Try restore from DB
      const restored = await this.recover();
      if (!restored || restored.sessionId !== sessionId) {
        throw new AppError('NOT_FOUND', 'No matching session to resume');
      }
    }
    state.paused = false;
    state.cancelled = false;
    if (state.session) {
      state.session.status = 'running';
      await sessionRepository.saveSession(state.session);
    }
    if (!state.running) {
      state.abort = new AbortController();
      void runLoop();
    }
    crawlerService.resume();
    logger.info('Session resumed', { category: 'queue', sessionId });
  },

  async cancel(sessionId: string): Promise<void> {
    if (state.session && state.session.id !== sessionId) {
      throw new AppError('NOT_FOUND', 'No matching active session');
    }
    state.cancelled = true;
    state.paused = false;
    state.abort?.abort();
    if (state.session) {
      state.session.status = 'cancelled';
      await sessionRepository.saveSession(state.session);
      emitSessionStatus(state.session, state.tasks);
    }
    for (const t of state.tasks) {
      if (t.status === 'running' || t.status === 'pending' || t.status === 'paused') {
        t.status = 'cancelled' as TaskStatus;
        await sessionRepository.saveTask(t);
        emitProgress(t);
      }
    }
    crawlerService.cancel();
    logger.info('Session cancelled', { category: 'queue', sessionId });
  },

  /**
   * Restore paused/running session after SW restart.
   */
  async recover(): Promise<{ sessionId: string } | null> {
    const active = await sessionRepository.getActiveSession();
    if (!active) return null;

    const tasks = await sessionRepository.getTasksForSession(active.id);
    const normalized = tasks.map((t) => ({
      ...t,
      pageStart: t.pageStart ?? 0,
      status:
        t.status === 'running'
          ? ('paused' as TaskStatus)
          : t.status,
    }));

    // Mark session paused for safe resume
    const session: ExtractionSession = {
      ...active,
      status: 'paused',
      settingsSnapshot: {
        ...DEFAULT_EXTRACTION_SETTINGS,
        ...active.settingsSnapshot,
      },
    };
    await sessionRepository.saveSession(session);
    await sessionRepository.saveTasks(normalized);

    state.session = session;
    state.tasks = normalized;
    state.running = false;
    state.paused = true;
    state.cancelled = false;
    state.abort = null;

    logger.info('Session recovered after restart', {
      category: 'queue',
      sessionId: session.id,
      context: { tasks: normalized.length },
    });

    emitSessionStatus(session, normalized);
    return { sessionId: session.id };
  },
};

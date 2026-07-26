/**
 * Website crawler queue — Phase 4.
 * Sequential, single reusable tab, pause/resume/cancel, recovery.
 */

import type { Business, CrawlStatus, SocialLinks } from '@/types/domain';
import { businessRepository } from '@/repositories';
import { logger } from '@/services/logger-service';
import { extractPageContacts } from '@/services/crawler-extract';
import {
  CONTACT_PATHS,
  prioritizeEmails,
} from '@/utils/extract-contact';
import { sleep } from '@/utils/async';
import { broadcastMessage } from '@/messaging';
import { ensureHttps, isValidUrl } from '@/utils/string';

const CRAWL_TAB_KEY = 'leadforge_crawl_tab_id';
const CRAWL_QUEUE_KEY = 'leadforge_crawl_queue';

export interface CrawlJob {
  businessId: string;
  website: string;
  sessionId?: string;
  status: CrawlStatus;
  attempts: number;
  createdAt: number;
}

type CrawlerState = {
  queue: CrawlJob[];
  running: boolean;
  paused: boolean;
  cancelled: boolean;
  currentBusinessId: string | null;
};

const state: CrawlerState = {
  queue: [],
  running: false,
  paused: false,
  cancelled: false,
  currentBusinessId: null,
};

function storage(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

async function persistQueue(): Promise<void> {
  return new Promise((resolve) => {
    storage().set({ [CRAWL_QUEUE_KEY]: state.queue }, () => resolve());
  });
}

async function loadQueue(): Promise<void> {
  return new Promise((resolve) => {
    storage().get(CRAWL_QUEUE_KEY, (result) => {
      const q = result[CRAWL_QUEUE_KEY] as CrawlJob[] | undefined;
      if (Array.isArray(q)) state.queue = q;
      resolve();
    });
  });
}

async function getCrawlTabId(): Promise<number | null> {
  return new Promise((resolve) => {
    storage().get(CRAWL_TAB_KEY, (result) => {
      const id = result[CRAWL_TAB_KEY];
      resolve(typeof id === 'number' ? id : null);
    });
  });
}

async function setCrawlTabId(id: number | null): Promise<void> {
  return new Promise((resolve) => {
    if (id === null) storage().remove(CRAWL_TAB_KEY, () => resolve());
    else storage().set({ [CRAWL_TAB_KEY]: id }, () => resolve());
  });
}

async function waitComplete(tabId: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    }, timeoutMs);

    function listener(id: number, info: chrome.tabs.TabChangeInfo): void {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    void chrome.tabs.get(tabId).then((t) => {
      if (t.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }).catch(() => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    });
  });
}

async function navigateAndExtract(
  url: string,
  timeoutMs: number
): Promise<ReturnType<typeof extractPageContacts> | null> {
  let tabId = await getCrawlTabId();
  let exists = false;
  if (tabId !== null) {
    try {
      await chrome.tabs.get(tabId);
      exists = true;
    } catch {
      exists = false;
      tabId = null;
    }
  }

  try {
    if (!exists || tabId === null) {
      const tab = await chrome.tabs.create({ url, active: false });
      if (tab.id == null) return null;
      tabId = tab.id;
      await setCrawlTabId(tabId);
    } else {
      await chrome.tabs.update(tabId, { url, active: false });
    }
  } catch (err) {
    logger.warn('Crawl navigation failed', {
      category: 'crawler',
      context: { url, error: String(err) },
    });
    return null;
  }

  const ok = await waitComplete(tabId, timeoutMs);
  if (!ok) return null;
  await sleep(800);

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractPageContacts,
    });
    const first = results[0]?.result;
    return first ?? null;
  } catch (err) {
    logger.warn('executeScript failed', {
      category: 'crawler',
      context: { url, error: String(err) },
    });
    return null;
  }
}

function mergeSocial(
  a: SocialLinks,
  b: SocialLinks
): SocialLinks {
  return {
    linkedin: a.linkedin || b.linkedin,
    facebook: a.facebook || b.facebook,
    instagram: a.instagram || b.instagram,
    twitter: a.twitter || b.twitter,
    youtube: a.youtube || b.youtube,
    pinterest: a.pinterest || b.pinterest,
    telegram: a.telegram || b.telegram,
    whatsapp: a.whatsapp || b.whatsapp,
  };
}

function mergeUnique(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((e) => e.toLowerCase()));
  const out = [...existing];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

async function crawlBusiness(
  job: CrawlJob,
  timeoutMs: number
): Promise<void> {
  const business = await businessRepository.getById(job.businessId);
  if (!business || !business.website) {
    job.status = 'skipped';
    return;
  }

  const website = ensureHttps(business.website);
  if (!isValidUrl(website)) {
    job.status = 'skipped';
    await businessRepository.upsert({
      ...business,
      crawlStatus: 'skipped',
      crawlError: 'Invalid website URL',
      lastUpdatedAt: Date.now(),
    });
    return;
  }

  const start = Date.now();
  job.status = 'running';
  state.currentBusinessId = job.businessId;

  await businessRepository.upsert({
    ...business,
    status: 'crawling',
    crawlStatus: 'running',
    lastVisited: Date.now(),
    lastUpdatedAt: Date.now(),
  });
  const runningBiz = await businessRepository.getById(job.businessId);
  if (runningBiz) broadcastMessage('BUSINESS_UPSERT', { business: runningBiz });

  let emails: string[] = [];
  let phones: string[] = [];
  let social: SocialLinks = {};
  let title: string | undefined;
  let meta: string | undefined;
  let contactHrefs: string[] = [];

  const home = await navigateAndExtract(website, timeoutMs);
  if (home) {
    emails = mergeUnique(emails, home.emails);
    phones = mergeUnique(phones, home.phones);
    social = mergeSocial(social, home.socialLinks);
    title = home.websiteTitle || title;
    meta = home.metaDescription || meta;
    contactHrefs = home.contactHrefs;
  }

  // Visit contact/about paths (max 3 extra pages)
  const origin = new URL(website).origin;
  const extraUrls = [
    ...contactHrefs,
    ...CONTACT_PATHS.map((p) => `${origin}${p}`),
  ];
  const visited = new Set<string>([website.replace(/\/$/, '')]);
  let pages = 0;
  for (const href of extraUrls) {
    if (state.cancelled || state.paused) break;
    if (pages >= 3) break;
    const normalized = href.replace(/\/$/, '');
    if (visited.has(normalized)) continue;
    if (!normalized.startsWith(origin)) continue;
    visited.add(normalized);
    pages += 1;
    const page = await navigateAndExtract(href, timeoutMs);
    if (page) {
      emails = mergeUnique(emails, page.emails);
      phones = mergeUnique(phones, page.phones);
      social = mergeSocial(social, page.socialLinks);
      title = title || page.websiteTitle;
      meta = meta || page.metaDescription;
    }
  }

  emails = prioritizeEmails(emails);
  const latest = await businessRepository.getById(job.businessId);
  if (!latest) return;

  const primaryPhone = phones[0] ?? latest.phone;
  const updated: Business = {
    ...latest,
    emails,
    emailCount: emails.length,
    phones,
    phone: latest.phone || primaryPhone,
    socialLinks: mergeSocial(latest.socialLinks ?? {}, social),
    websiteTitle: latest.websiteTitle || title,
    metaDescription: latest.metaDescription || meta,
    crawlStatus: home ? 'completed' : 'failed',
    crawlTime: Date.now() - start,
    crawledAt: Date.now(),
    lastVisited: Date.now(),
    lastUpdatedAt: Date.now(),
    status: home ? 'crawled' : latest.status === 'crawling' ? 'discovered' : latest.status,
    crawlError: home ? undefined : 'Failed to load website',
  };

  await businessRepository.upsert(updated);
  broadcastMessage('BUSINESS_UPSERT', { business: updated });
  job.status = updated.crawlStatus;

  logger.info('Website crawled', {
    category: 'crawler',
    context: {
      businessId: job.businessId,
      website,
      emails: emails.length,
      phones: phones.length,
      status: job.status,
    },
  });
}

async function processQueue(timeoutMs: number): Promise<void> {
  if (state.running) return;
  state.running = true;
  state.cancelled = false;

  while (state.queue.some((j) => j.status === 'pending' || j.status === 'failed')) {
    if (state.cancelled) break;
    while (state.paused && !state.cancelled) {
      await sleep(400);
    }
    if (state.cancelled) break;

    const job = state.queue.find(
      (j) =>
        j.status === 'pending' ||
        (j.status === 'failed' && j.attempts < 2)
    );
    if (!job) break;

    job.attempts += 1;
    try {
      await crawlBusiness(job, timeoutMs);
      if (job.status === 'failed' && job.attempts < 2) {
        job.status = 'pending';
      }
    } catch (err) {
      job.status = 'failed';
      logger.error('Crawl job error', {
        category: 'crawler',
        context: { businessId: job.businessId, error: String(err) },
      });
    }
    await persistQueue();
    await sleep(500);
  }

  state.running = false;
  state.currentBusinessId = null;
}

export const crawlerService = {
  async enqueue(
    businessId: string,
    website: string,
    sessionId?: string
  ): Promise<void> {
    await loadQueue();
    if (state.queue.some((j) => j.businessId === businessId && j.status !== 'failed')) {
      return;
    }
    state.queue.push({
      businessId,
      website,
      sessionId,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    });
    await persistQueue();
  },

  async start(timeoutMs = 12_000): Promise<void> {
    await loadQueue();
    state.paused = false;
    state.cancelled = false;
    void processQueue(timeoutMs);
  },

  pause(): void {
    state.paused = true;
    logger.info('Crawler paused', { category: 'crawler' });
  },

  resume(timeoutMs = 12_000): void {
    state.paused = false;
    if (!state.running) void processQueue(timeoutMs);
    logger.info('Crawler resumed', { category: 'crawler' });
  },

  cancel(): void {
    state.cancelled = true;
    state.paused = false;
    for (const j of state.queue) {
      if (j.status === 'pending' || j.status === 'running') {
        j.status = 'cancelled';
      }
    }
    void persistQueue();
    logger.info('Crawler cancelled', { category: 'crawler' });
  },

  async recover(timeoutMs = 12_000): Promise<void> {
    await loadQueue();
    for (const j of state.queue) {
      if (j.status === 'running') j.status = 'pending';
    }
    await persistQueue();
    if (state.queue.some((j) => j.status === 'pending')) {
      state.paused = false;
      void processQueue(timeoutMs);
    }
  },

  getQueue(): CrawlJob[] {
    return [...state.queue];
  },
};

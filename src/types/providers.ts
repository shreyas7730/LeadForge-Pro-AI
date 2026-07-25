/**
 * Provider & future-module interfaces only — Phase 2.
 * No implementations. Phase 3+ will implement these.
 */

import type { Business, ExtractionSettings } from './domain';

/** Raw candidate before identity normalization / storage. */
export interface RawBusinessCandidate {
  companyName: string;
  cid?: string;
  category?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
}

export interface ProviderParser {
  parsePage(doc: Document): AsyncGenerator<RawBusinessCandidate>;
  detectEndOfResults(doc: Document): boolean;
  extractPaginationInfo(doc: Document): {
    currentStart: number;
    hasNext: boolean;
  };
}

export interface SearchProvider {
  id: string;
  name: string;
  supportedLocales: string[];
  createSearchUrl(query: string, page: number): string;
  matchesTab(url: string): boolean;
  getParser(): ProviderParser;
  getDefaultSettings(): Partial<ExtractionSettings>;
}

export interface CrawlerJobInput {
  jobId: string;
  businessId: string;
  url: string;
  maxDepth: number;
  timeoutMs: number;
  exclusionRegexes: string[];
}

export interface CrawlerResult {
  businessId: string;
  website: string;
  emails: string[];
  pagesVisited: number;
  durationMs: number;
  error?: string;
}

export interface WebsiteCrawler {
  crawl(input: CrawlerJobInput, signal?: AbortSignal): Promise<CrawlerResult>;
}

export interface EmailExtractor {
  extractFromHtml(html: string, baseUrl: string): string[];
}

export interface PhoneExtractor {
  extractFromText(text: string): string[];
}

export interface SocialExtractor {
  extractProfiles(html: string, baseUrl: string): Record<string, string>;
}

export interface ExportEngine {
  exportCsv(rows: Business[], columns: string[]): Promise<Blob>;
  exportJson(rows: Business[], columns: string[]): Promise<Blob>;
  exportXlsx(rows: Business[], columns: string[]): Promise<Blob>;
}

export interface GoogleSearchParser extends ProviderParser {
  providerId: 'google-local';
}

export interface GoogleMapsParser extends ProviderParser {
  providerId: 'google-maps';
}

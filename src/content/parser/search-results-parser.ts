/**
 * Aggregates all Google Search parsers for a page.
 */

import type { ParsedCandidate } from '@/types/messages';
import { parseLocalCards } from './local-card-parser';
import { parseOrganicResults } from './organic-parser';
import { parseKnowledgePanel } from './knowledge-panel-parser';

export interface PageParseResult {
  candidates: ParsedCandidate[];
  hasNextPage: boolean;
  nextStart: number;
  pageStart: number;
}

function detectPagination(doc: Document): {
  hasNextPage: boolean;
  pageStart: number;
  nextStart: number;
} {
  let pageStart = 0;
  try {
    const url = new URL(location.href);
    const s = url.searchParams.get('start');
    if (s) {
      const n = Number(s);
      if (Number.isFinite(n) && n >= 0) pageStart = n;
    }
  } catch {
    // ignore
  }

  const nextLink =
    doc.querySelector('a#pnnext') ||
    doc.querySelector('a[aria-label="Next page"]') ||
    doc.querySelector('a[aria-label="Next"]');

  const hasNextPage = Boolean(nextLink);
  // Google Local typically advances by 20
  const nextStart = pageStart + 20;

  return { hasNextPage, pageStart, nextStart };
}

export function parseSearchPage(doc: Document = document): PageParseResult {
  const local = parseLocalCards(doc);
  const organic = parseOrganicResults(doc);
  const knowledge = parseKnowledgePanel(doc);

  // Prefer local cards; merge unique by name
  const merged: ParsedCandidate[] = [];
  const seen = new Set<string>();

  for (const list of [local, knowledge, organic]) {
    for (const c of list) {
      const key = c.companyName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(c);
    }
  }

  const pagination = detectPagination(doc);

  return {
    candidates: merged,
    hasNextPage: pagination.hasNextPage,
    nextStart: pagination.nextStart,
    pageStart: pagination.pageStart,
  };
}

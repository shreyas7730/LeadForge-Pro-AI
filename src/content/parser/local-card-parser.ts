/**
 * Google Local pack / local result card parser.
 * Defensive selectors — Google DOM changes frequently.
 */

import type { ParsedCandidate } from '@/types/messages';
import { normalizeCandidate } from './normalize-candidate';

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function attr(el: Element | null | undefined, name: string): string {
  return el?.getAttribute(name)?.trim() ?? '';
}

function findWebsite(root: Element): string | undefined {
  const anchors = Array.from(root.querySelectorAll('a[href]'));
  for (const a of anchors) {
    const href = attr(a, 'href');
    if (!href) continue;
    if (href.includes('google.') && href.includes('/url')) {
      try {
        const u = new URL(href, location.origin);
        const target = u.searchParams.get('q') ?? u.searchParams.get('url');
        if (target && !target.includes('google.')) return target;
      } catch {
        // continue
      }
    }
    if (
      /^https?:\/\//i.test(href) &&
      !href.includes('google.') &&
      !href.includes('maps')
    ) {
      return href;
    }
  }
  return undefined;
}

function findMapsUrl(root: Element): string | undefined {
  const a = root.querySelector(
    'a[href*="/maps/place"], a[href*="maps.google"], a[data-url*="maps"]'
  );
  if (!a) return undefined;
  const href = attr(a, 'href') || attr(a, 'data-url');
  return href || undefined;
}

function findCid(root: Element): string | undefined {
  const dataCid = attr(root, 'data-cid') || attr(root, 'data-ludocid');
  if (dataCid) return dataCid;
  const maps = findMapsUrl(root);
  if (maps) {
    const m = maps.match(/!1s(0x[0-9a-f:]+)/i) ?? maps.match(/cid=(\d+)/i);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

function findRating(root: Element): { rating?: number; reviews?: number } {
  const aria = root.querySelector('[aria-label*="star"], [aria-label*="Star"]');
  const label = attr(aria, 'aria-label') || textOf(aria);
  const ratingMatch = label.match(/([0-5](?:\.\d+)?)\s*star/i);
  const reviewMatch =
    label.match(/(\d[\d,]*)\s*review/i) ||
    textOf(root).match(/\((\d[\d,]*)\)/);
  const ratingGroup = ratingMatch?.[1];
  const reviewGroup = reviewMatch?.[1];
  return {
    rating: ratingGroup ? Number(ratingGroup) : undefined,
    reviews: reviewGroup
      ? Number(reviewGroup.replace(/,/g, ''))
      : undefined,
  };
}

function findPhone(root: Element): string | undefined {
  const tel = root.querySelector('a[href^="tel:"]');
  if (tel) {
    return attr(tel, 'href').replace(/^tel:/i, '');
  }
  const text = textOf(root);
  const m = text.match(
    /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/
  );
  return m?.[0];
}

/**
 * Extract local business cards from the current Google Search document.
 */
export function parseLocalCards(doc: Document): ParsedCandidate[] {
  const results: ParsedCandidate[] = [];
  const seen = new Set<string>();

  const selectors = [
    'div[data-cid]',
    'div[jscontroller][data-record-click-time]',
    'div[role="article"]',
    'c-wiz div[data-hveid]',
  ];

  const nodes = new Set<Element>();
  for (const sel of selectors) {
    doc.querySelectorAll(sel).forEach((n) => nodes.add(n));
  }

  // Also scan for maps place links as anchors for cards
  doc.querySelectorAll('a[href*="/maps/place"]').forEach((a) => {
    const card =
      a.closest('div[data-cid]') ||
      a.closest('[role="article"]') ||
      a.parentElement?.parentElement;
    if (card) nodes.add(card);
  });

  for (const node of nodes) {
    const nameEl =
      node.querySelector('[role="heading"]') ||
      node.querySelector('div[aria-level]') ||
      node.querySelector('a[href*="/maps/place"]') ||
      node.querySelector('span.OSrXXb') ||
      node.querySelector('div.fontHeadlineSmall');

    const companyName = textOf(nameEl);
    if (!companyName || companyName.length < 2) continue;

    const key = companyName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const { rating, reviews } = findRating(node);
    const candidate = normalizeCandidate({
      companyName,
      cid: findCid(node),
      category: textOf(
        node.querySelector('span.YhemCb, div.W4Efsd > span > span')
      ),
      phone: findPhone(node),
      website: findWebsite(node),
      address: textOf(
        node.querySelector('span.LrzXr, div[data-dtype="d3adr"]')
      ),
      rating,
      reviewCount: reviews,
      mapsUrl: findMapsUrl(node),
      googleUrl: location.href,
      openStatus: textOf(
        node.querySelector('span[style*="color"], span.opened')
      ),
      sourceBlock: 'local-card',
    });

    if (candidate) results.push(candidate);
  }

  return results;
}

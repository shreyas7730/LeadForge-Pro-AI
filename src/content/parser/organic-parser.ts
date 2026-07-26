/**
 * Organic Google Search result parser — Phase 4 improved.
 */

import type { ParsedCandidate } from '@/types/messages';
import { normalizeCandidate } from './normalize-candidate';

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function attr(el: Element | null | undefined, name: string): string {
  return el?.getAttribute(name)?.trim() ?? '';
}

function unwrapGoogleUrl(href: string): string {
  try {
    const u = new URL(href, location.origin);
    if (u.pathname === '/url') {
      return u.searchParams.get('q') ?? u.searchParams.get('url') ?? href;
    }
  } catch {
    // keep
  }
  return href;
}

export function parseOrganicResults(doc: Document): ParsedCandidate[] {
  const results: ParsedCandidate[] = [];
  const seen = new Set<string>();

  const blocks = doc.querySelectorAll(
    'div.g, div[data-sokoban-container], div.MjjYud, div[data-hveid][data-ved]'
  );

  for (const block of Array.from(blocks)) {
    if (
      block.querySelector('a[href*="/maps/place"]') &&
      block.querySelector('[data-cid]')
    ) {
      continue;
    }

    const h3 = block.querySelector('h3');
    const companyName = textOf(h3);
    if (!companyName || companyName.length < 2) continue;

    const key = companyName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const titleLink =
      h3?.closest('a') ||
      block.querySelector('a[href] h3')?.parentElement ||
      block.querySelector('a[data-ved]');

    const href = titleLink ? attr(titleLink as Element, 'href') : '';
    const website = href ? unwrapGoogleUrl(href) : undefined;

    const snippet = textOf(
      block.querySelector(
        'div[data-sncf], div.VwiC3b, span.aCOpRe, div.IsZvec, div[style*="-webkit-line-clamp"], div.yDYNvb'
      )
    );

    const cite = textOf(block.querySelector('cite'));

    const candidate = normalizeCandidate({
      companyName,
      website,
      websiteName: cite || undefined,
      snippet: snippet || undefined,
      googleUrl: location.href,
      sourceBlock: 'organic',
    });

    if (candidate) results.push(candidate);
  }

  return results;
}

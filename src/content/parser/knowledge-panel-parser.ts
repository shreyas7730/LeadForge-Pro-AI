/**
 * Google Knowledge Panel parser (right-side entity panel).
 */

import type { ParsedCandidate } from '@/types/messages';
import { normalizeCandidate } from './normalize-candidate';

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function attr(el: Element | null | undefined, name: string): string {
  return el?.getAttribute(name)?.trim() ?? '';
}

export function parseKnowledgePanel(doc: Document): ParsedCandidate[] {
  const panel =
    doc.querySelector('div.kp-wholepage') ||
    doc.querySelector('div.knowledge-panel') ||
    doc.querySelector('div[data-attrid="title"]')?.closest('div.oslo-tile') ||
    doc.querySelector('div.right-column-wrapper') ||
    doc.querySelector('#rhs');

  if (!panel) return [];

  const titleEl =
    panel.querySelector('[data-attrid="title"] span') ||
    panel.querySelector('h2') ||
    panel.querySelector('div[role="heading"]');

  const companyName = textOf(titleEl);
  if (!companyName || companyName.length < 2) return [];

  const category = textOf(
    panel.querySelector('[data-attrid="subtitle"]') ||
      panel.querySelector('div.wwUB2c')
  );

  const address = textOf(
    panel.querySelector('[data-attrid*="address"]') ||
      panel.querySelector('span.LrzXr')
  );

  const phoneEl = panel.querySelector('a[href^="tel:"], [data-attrid*="phone"]');
  const phone = phoneEl
    ? attr(phoneEl, 'href').replace(/^tel:/i, '') || textOf(phoneEl)
    : undefined;

  const websiteEl = Array.from(panel.querySelectorAll('a[href]')).find((a) => {
    const href = attr(a, 'href');
    return (
      href.startsWith('http') &&
      !href.includes('google.') &&
      !href.includes('youtube.')
    );
  });

  const ratingLabel = attr(
    panel.querySelector('[aria-label*="star"]'),
    'aria-label'
  );
  const ratingMatch = ratingLabel.match(/([0-5](?:\.\d+)?)/);
  const reviewMatch = ratingLabel.match(/(\d[\d,]*)\s*review/i);

  const maps = panel.querySelector('a[href*="/maps"]');
  const hours = textOf(
    panel.querySelector('[data-attrid*="hour"], div.t39EBf')
  );

  const candidate = normalizeCandidate({
    companyName,
    category: category || undefined,
    address: address || undefined,
    phone: phone || undefined,
    website: websiteEl ? attr(websiteEl, 'href') : undefined,
    rating: ratingMatch?.[1] ? Number(ratingMatch[1]) : undefined,
    reviewCount: (() => {
      const group = reviewMatch?.[1];
      return group ? Number(group.replace(/,/g, '')) : undefined;
    })(),
    mapsUrl: maps ? attr(maps, 'href') : undefined,
    hours: hours || undefined,
    googleUrl: location.href,
    sourceBlock: 'knowledge-panel',
  });

  return candidate ? [candidate] : [];
}

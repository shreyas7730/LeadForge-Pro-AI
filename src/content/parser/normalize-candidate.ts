/**
 * Normalize raw DOM-extracted candidate fields.
 */

import {
  ensureHttps,
  isValidUrl,
  normalizeWhitespace,
} from '@/utils/string';
import type { ParsedCandidate } from '@/types/messages';

export function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d+()\-\s]/g, '').trim();
  if (cleaned.replace(/\D/g, '').length < 7) return undefined;
  return normalizeWhitespace(cleaned);
}

export function normalizeWebsite(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let value = normalizeWhitespace(raw);
  // Strip Google redirect wrappers
  try {
    const u = new URL(value, 'https://www.google.com');
    if (u.hostname.includes('google.') && u.pathname === '/url') {
      const q = u.searchParams.get('q') ?? u.searchParams.get('url');
      if (q) value = q;
    }
  } catch {
    // keep value
  }
  if (!/^https?:\/\//i.test(value)) {
    value = ensureHttps(value);
  }
  if (!isValidUrl(value)) return undefined;
  // Drop google-owned destinations
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    if (
      host === 'google.com' ||
      host.endsWith('.google.com') ||
      host === 'maps.google.com'
    ) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return value;
}

export function normalizeRating(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 5) return undefined;
  return n;
}

export function normalizeReviewCount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeCandidate(
  partial: Partial<ParsedCandidate> & { companyName: string; sourceBlock: ParsedCandidate['sourceBlock'] }
): ParsedCandidate | null {
  const companyName = normalizeWhitespace(partial.companyName);
  if (!companyName || companyName.length < 2) return null;

  return {
    companyName,
    cid: partial.cid ? normalizeWhitespace(partial.cid) : undefined,
    category: partial.category
      ? normalizeWhitespace(partial.category)
      : undefined,
    phone: normalizePhone(partial.phone),
    website: normalizeWebsite(partial.website),
    websiteName: partial.websiteName
      ? normalizeWhitespace(partial.websiteName)
      : undefined,
    address: partial.address
      ? normalizeWhitespace(partial.address)
      : undefined,
    rating:
      typeof partial.rating === 'number'
        ? partial.rating
        : normalizeRating(String(partial.rating ?? '')),
    reviewCount:
      typeof partial.reviewCount === 'number'
        ? partial.reviewCount
        : normalizeReviewCount(String(partial.reviewCount ?? '')),
    latitude: partial.latitude,
    longitude: partial.longitude,
    googleUrl: partial.googleUrl
      ? normalizeWebsite(partial.googleUrl) ?? partial.googleUrl
      : undefined,
    mapsUrl: partial.mapsUrl
      ? normalizeWhitespace(partial.mapsUrl)
      : undefined,
    snippet: partial.snippet
      ? normalizeWhitespace(partial.snippet)
      : undefined,
    openStatus: partial.openStatus
      ? normalizeWhitespace(partial.openStatus)
      : undefined,
    hours: partial.hours ? normalizeWhitespace(partial.hours) : undefined,
    sourceBlock: partial.sourceBlock,
  };
}

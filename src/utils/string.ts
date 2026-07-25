/** String & URL helpers — Phase 2 */

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeIdentityPart(value: string | undefined | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ensureHttps(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

/** Build a stable identity key for deduplication. */
export function buildIdentityKey(parts: {
  cid?: string;
  keyword?: string;
  location?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  website?: string;
}): string {
  if (parts.cid) {
    return `cid:${normalizeIdentityPart(parts.cid)}`;
  }
  const base = [
    parts.keyword,
    parts.location,
    parts.companyName,
  ]
    .map(normalizeIdentityPart)
    .filter(Boolean)
    .join('|');
  const extra = [parts.address, parts.phone, parts.website]
    .map(normalizeIdentityPart)
    .find(Boolean);
  return extra ? `${base}|${extra}` : base || 'unknown';
}

/** Parse Google Local search URL parameters (for future Phase 3). */
export function parseGoogleSearchUrl(href: string): {
  query: string | null;
  start: number;
  udm: string | null;
} {
  try {
    const url = new URL(href);
    const q = url.searchParams.get('q');
    const startRaw = url.searchParams.get('start');
    const start = startRaw ? Number(startRaw) : 0;
    return {
      query: q,
      start: Number.isFinite(start) && start >= 0 ? start : 0,
      udm: url.searchParams.get('udm'),
    };
  } catch {
    return { query: null, start: 0, udm: null };
  }
}

export function buildGoogleLocalSearchUrl(
  query: string,
  start = 0
): string {
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', query);
  url.searchParams.set('udm', '1');
  if (start > 0) {
    url.searchParams.set('start', String(start));
  }
  return url.toString();
}

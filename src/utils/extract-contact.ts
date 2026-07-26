import type { SocialLinks } from '@/types/domain';

/**
 * Pure contact extraction helpers — used by crawler page scripts and tests.
 * No DOM dependency except when document is passed.
 */

const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s\-.]?)?(?:\(?\d{2,5}\)?[\s\-.]?)?\d{3,5}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,5})?/g;

const SOCIAL_PATTERNS: { key: keyof SocialLinks; re: RegExp }[] = [
  { key: 'linkedin', re: /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/i },
  { key: 'facebook', re: /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i },
  { key: 'instagram', re: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i },
  { key: 'twitter', re: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\s"'<>]+/i },
  { key: 'youtube', re: /https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>]+/i },
  { key: 'pinterest', re: /https?:\/\/(?:www\.)?pinterest\.com\/[^\s"'<>]+/i },
  { key: 'telegram', re: /https?:\/\/(?:t\.me|telegram\.me)\/[^\s"'<>]+/i },
  { key: 'whatsapp', re: /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\s"'<>]+/i },
];

const EXCLUDED_EMAIL_HOSTS = new Set([
  'example.com',
  'domain.com',
  'email.com',
  'sentry.io',
  'wixpress.com',
  'wordpress.com',
  'schema.org',
  'googleapis.com',
  'gstatic.com',
]);

export function isValidEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  if (e.endsWith('.png') || e.endsWith('.jpg') || e.endsWith('.gif')) return false;
  if (e.includes('..')) return false;
  const host = e.split('@')[1] ?? '';
  if (EXCLUDED_EMAIL_HOSTS.has(host)) return false;
  return true;
}

export function extractEmailsFromText(text: string): string[] {
  const found = text.match(EMAIL_REGEX) ?? [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of found) {
    const e = raw.toLowerCase();
    if (!isValidEmail(e) || seen.has(e)) continue;
    seen.add(e);
    unique.push(e);
  }
  return unique;
}

export function normalizePhoneNumber(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return undefined;
  // Reject obvious years / IDs
  if (/^(19|20)\d{2}$/.test(digits)) return undefined;
  return raw.replace(/\s+/g, ' ').trim();
}

export function extractPhonesFromText(text: string): string[] {
  const found = text.match(PHONE_REGEX) ?? [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of found) {
    const n = normalizePhoneNumber(raw);
    if (!n) continue;
    const key = n.replace(/\D/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(n);
  }
  return unique;
}

export function extractSocialLinksFromText(
  text: string
): SocialLinks {
  const links: SocialLinks = {};
  for (const { key, re } of SOCIAL_PATTERNS) {
    const m = text.match(re);
    if (m?.[0] && !links[key]) {
      links[key] = m[0].replace(/[.,;)]+$/, '');
    }
  }
  return links;
}

/** Contact path candidates relative to site origin. */
export const CONTACT_PATHS = [
  '/contact',
  '/contact-us',
  '/contactus',
  '/about',
  '/about-us',
  '/aboutus',
  '/company',
  '/get-in-touch',
  '/getintouch',
  '/support',
  '/reach-us',
  '/enquiry',
  '/inquiry',
  '/connect',
] as const;

export function prioritizeEmails(emails: string[]): string[] {
  const rank = (e: string): number => {
    const local = e.split('@')[0] ?? '';
    if (local === 'info' || local === 'contact' || local === 'hello') return 0;
    if (local === 'sales' || local === 'enquiry' || local === 'inquiry') return 1;
    if (local === 'support' || local === 'office' || local === 'admin') return 2;
    if (local === 'export' || local === 'purchase' || local === 'marketing') return 3;
    return 10;
  };
  return [...emails].sort((a, b) => rank(a) - rank(b));
}

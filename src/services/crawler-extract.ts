/**
 * In-page extraction function for chrome.scripting.executeScript.
 * Must be self-contained (no closure imports) — serialized into the page.
 */

export interface PageExtractResult {
  emails: string[];
  phones: string[];
  socialLinks: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    pinterest?: string;
    telegram?: string;
    whatsapp?: string;
  };
  websiteTitle?: string;
  metaDescription?: string;
  contactHrefs: string[];
  pageUrl: string;
}

/** Runs inside the target page via executeScript. */
export function extractPageContacts(): PageExtractResult {
  const EMAIL_RE =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const PHONE_RE =
    /(?:\+?\d{1,3}[\s\-.]?)?(?:\(?\d{2,5}\)?[\s\-.]?)?\d{3,5}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,5})?/g;

  const html = document.documentElement?.outerHTML ?? '';
  const bodyText = document.body?.innerText ?? '';
  const combined = `${html}\n${bodyText}`;

  const emailSet = new Set<string>();
  for (const m of combined.match(EMAIL_RE) ?? []) {
    const e = m.toLowerCase();
    if (
      e.includes('.png') ||
      e.includes('.jpg') ||
      e.endsWith('.js') ||
      e.includes('example.com') ||
      e.includes('sentry.io') ||
      e.includes('wixpress.com') ||
      e.includes('schema.org')
    ) {
      continue;
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) emailSet.add(e);
  }

  // mailto:
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    const addr = href.replace(/^mailto:/i, '').split('?')[0]?.trim().toLowerCase();
    if (addr && addr.includes('@')) emailSet.add(addr);
  });

  const phoneSet = new Set<string>();
  document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
    const t = (a.getAttribute('href') ?? '').replace(/^tel:/i, '').trim();
    if (t.replace(/\D/g, '').length >= 7) phoneSet.add(t);
  });
  for (const m of bodyText.match(PHONE_RE) ?? []) {
    const digits = m.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      phoneSet.add(m.replace(/\s+/g, ' ').trim());
    }
  }

  const social: PageExtractResult['socialLinks'] = {};
  const socialMap: [keyof PageExtractResult['socialLinks'], RegExp][] = [
    ['linkedin', /linkedin\.com/i],
    ['facebook', /facebook\.com/i],
    ['instagram', /instagram\.com/i],
    ['twitter', /(twitter\.com|x\.com)/i],
    ['youtube', /youtube\.com/i],
    ['pinterest', /pinterest\.com/i],
    ['telegram', /(t\.me|telegram\.me)/i],
    ['whatsapp', /(wa\.me|api\.whatsapp\.com)/i],
  ];
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    for (const [key, re] of socialMap) {
      if (!social[key] && re.test(href) && href.startsWith('http')) {
        social[key] = href;
      }
    }
  });

  const contactHrefs: string[] = [];
  const contactRe =
    /contact|about|get-?in-?touch|enquiry|inquiry|support|company|reach/i;
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    const text = (a.textContent ?? '').trim();
    if (contactRe.test(href) || contactRe.test(text)) {
      try {
        const abs = new URL(href, location.href).href;
        if (abs.startsWith('http') && !contactHrefs.includes(abs)) {
          contactHrefs.push(abs);
        }
      } catch {
        // skip
      }
    }
  });

  const metaDesc =
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content') ?? undefined;

  return {
    emails: Array.from(emailSet),
    phones: Array.from(phoneSet),
    socialLinks: social,
    websiteTitle: document.title || undefined,
    metaDescription: metaDesc || undefined,
    contactHrefs: contactHrefs.slice(0, 8),
    pageUrl: location.href,
  };
}

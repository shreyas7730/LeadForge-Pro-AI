/** Centralized application constants — Phase 2 */

export const APP_NAME = 'LeadForge Pro AI';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  theme: 'leadforge_theme',
  windowId: 'leadforge_window_id',
  windowBounds: 'leadforge_window_bounds',
  settings: 'leadforge_settings',
  sidebarCollapsed: 'leadforge_sidebar_collapsed',
} as const;

export const LIMITS = {
  maxBusinessesPerSession: 50_000,
  maxEmailsPerBusiness: 5,
  maxLogEntries: 10_000,
  maxRecentSearches: 50,
  maxExportHistory: 100,
  maxNotificationsQueue: 20,
  logRetentionDays: 30,
} as const;

export const TIMEOUTS = {
  messageMs: 15_000,
  storageMs: 5_000,
  defaultRequestMs: 8_000,
  crawlDefaultMs: 12_000,
} as const;

export const ANIMATION = {
  fastMs: 100,
  normalMs: 200,
  slowMs: 300,
} as const;

export const ROUTES = {
  dashboard: '/',
  extraction: '/extraction',
  queue: '/queue',
  results: '/results',
  analytics: '/analytics',
  exports: '/exports',
  settings: '/settings',
  logs: '/logs',
  help: '/help',
  about: '/about',
} as const;

export const DB_NAME = 'LeadForgeProAI';
export const DB_VERSION = 1;

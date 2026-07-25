/**
 * SettingsService — app settings persistence via chrome.storage.
 * Extends Phase 1 theme handling without breaking it.
 */

import type { AppSettings, ThemeMode, WindowBounds } from '@/types/settings';
import { DEFAULT_WINDOW_BOUNDS } from '@/types/settings';
import {
  DEFAULT_EXTRACTION_SETTINGS,
  type ExtractionSettings,
} from '@/types/domain';
import { STORAGE_KEYS } from '@/constants';
import {
  chromeStorageGet,
  chromeStorageSet,
} from '@/services/storage/chrome-storage';

export interface FullSettings {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  windowBounds: WindowBounds | null;
  extraction: ExtractionSettings;
}

const DEFAULT_FULL: FullSettings = {
  theme: 'dark',
  sidebarCollapsed: false,
  windowBounds: null,
  extraction: { ...DEFAULT_EXTRACTION_SETTINGS },
};

export const settingsService = {
  async load(): Promise<FullSettings> {
    const stored = await chromeStorageGet<Partial<FullSettings>>(
      STORAGE_KEYS.settings
    );
    const theme =
      (await chromeStorageGet<ThemeMode>(STORAGE_KEYS.theme)) ??
      stored?.theme ??
      DEFAULT_FULL.theme;
    const sidebarCollapsed =
      (await chromeStorageGet<boolean>(STORAGE_KEYS.sidebarCollapsed)) ??
      stored?.sidebarCollapsed ??
      false;
    const windowBounds =
      (await chromeStorageGet<WindowBounds>(STORAGE_KEYS.windowBounds)) ??
      stored?.windowBounds ??
      null;

    return {
      theme,
      sidebarCollapsed,
      windowBounds,
      extraction: {
        ...DEFAULT_EXTRACTION_SETTINGS,
        ...stored?.extraction,
      },
    };
  },

  async save(partial: Partial<FullSettings>): Promise<void> {
    const current = await this.load();
    const next: FullSettings = { ...current, ...partial };
    if (partial.extraction) {
      next.extraction = { ...current.extraction, ...partial.extraction };
    }
    await chromeStorageSet(STORAGE_KEYS.settings, next);
    if (partial.theme !== undefined) {
      await chromeStorageSet(STORAGE_KEYS.theme, partial.theme);
    }
    if (partial.sidebarCollapsed !== undefined) {
      await chromeStorageSet(
        STORAGE_KEYS.sidebarCollapsed,
        partial.sidebarCollapsed
      );
    }
    if (partial.windowBounds !== undefined) {
      await chromeStorageSet(STORAGE_KEYS.windowBounds, partial.windowBounds);
    }
  },

  async getTheme(): Promise<ThemeMode> {
    return (await chromeStorageGet<ThemeMode>(STORAGE_KEYS.theme)) ?? 'dark';
  },

  async setTheme(theme: ThemeMode): Promise<void> {
    await chromeStorageSet(STORAGE_KEYS.theme, theme);
  },

  getDefaultWindowBounds(): WindowBounds {
    return { ...DEFAULT_WINDOW_BOUNDS };
  },

  /** Legacy shape used by Phase 1 window service compatibility. */
  async getAppSettings(): Promise<AppSettings> {
    const full = await this.load();
    return {
      theme: full.theme,
      windowBounds: full.windowBounds,
      lastWindowId: null,
    };
  },
};

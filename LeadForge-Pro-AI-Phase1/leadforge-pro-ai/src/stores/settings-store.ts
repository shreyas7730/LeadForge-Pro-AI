import { create } from 'zustand';
import type { ThemeMode } from '@/types/settings';

interface SettingsState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

function applyThemeToDocument(theme: ThemeMode) {
  const root = document.documentElement;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme;

  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark',
  sidebarCollapsed: false,

  setTheme: (theme) => {
    set({ theme });
    applyThemeToDocument(theme);
    // Persist via chrome.storage when available (Phase 2 expands this)
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        void chrome.storage.local.set({ theme });
      } else {
        localStorage.setItem('leadforge-theme', theme);
      }
    } catch {
      localStorage.setItem('leadforge-theme', theme);
    }
  },

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },
}));

/** Call once on app boot to restore theme. */
export function hydrateTheme() {
  let theme: ThemeMode = 'dark';
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get('theme', (result) => {
        const stored = result['theme'] as ThemeMode | undefined;
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          useSettingsStore.getState().setTheme(stored);
        } else {
          applyThemeToDocument('dark');
        }
      });
      return;
    }
    const stored = localStorage.getItem('leadforge-theme') as ThemeMode | null;
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      theme = stored;
    }
  } catch {
    // ignore
  }
  useSettingsStore.getState().setTheme(theme);
}

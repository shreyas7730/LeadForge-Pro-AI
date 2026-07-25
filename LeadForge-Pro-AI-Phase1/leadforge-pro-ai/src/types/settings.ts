export type ThemeMode = 'dark' | 'light' | 'system';

export interface WindowBounds {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface AppSettings {
  theme: ThemeMode;
  windowBounds: WindowBounds | null;
  lastWindowId: number | null;
}

export const DEFAULT_WINDOW_BOUNDS: WindowBounds = {
  width: 1280,
  height: 800,
  left: 100,
  top: 80,
};

export const MIN_WINDOW_WIDTH = 1024;
export const MIN_WINDOW_HEIGHT = 680;

/**
 * WindowService — single-instance desktop window management.
 * Phase 1: create / focus / persist bounds.
 * Lives in the background service worker context.
 */

import {
  DEFAULT_WINDOW_BOUNDS,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  type WindowBounds,
} from '@/types/settings';

const STORAGE_KEYS = {
  windowId: 'leadforge_window_id',
  bounds: 'leadforge_window_bounds',
} as const;

async function getStoredWindowId(): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.windowId, (result) => {
      const id = result[STORAGE_KEYS.windowId];
      resolve(typeof id === 'number' ? id : null);
    });
  });
}

async function setStoredWindowId(id: number | null): Promise<void> {
  return new Promise((resolve) => {
    if (id === null) {
      chrome.storage.local.remove(STORAGE_KEYS.windowId, () => resolve());
    } else {
      chrome.storage.local.set({ [STORAGE_KEYS.windowId]: id }, () => resolve());
    }
  });
}

async function getStoredBounds(): Promise<WindowBounds | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.bounds, (result) => {
      const bounds = result[STORAGE_KEYS.bounds] as WindowBounds | undefined;
      if (
        bounds &&
        typeof bounds.width === 'number' &&
        typeof bounds.height === 'number'
      ) {
        resolve(bounds);
      } else {
        resolve(null);
      }
    });
  });
}

async function setStoredBounds(bounds: WindowBounds): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.bounds]: bounds }, () => resolve());
  });
}

function getCenteredBounds(
  width: number,
  height: number
): WindowBounds {
  // Approximate center; screen APIs are limited in SW
  return {
    width: Math.max(width, MIN_WINDOW_WIDTH),
    height: Math.max(height, MIN_WINDOW_HEIGHT),
    left: 120,
    top: 80,
  };
}

/**
 * Launch the application window.
 * If an existing instance is open, focus it.
 * Otherwise create a new window and persist its id + bounds.
 */
export async function launchAppWindow(): Promise<void> {
  const existingId = await getStoredWindowId();

  if (existingId !== null) {
    try {
      await chrome.windows.update(existingId, { focused: true });
      return;
    } catch {
      // Window was closed; clear stale id
      await setStoredWindowId(null);
    }
  }

  const storedBounds = await getStoredBounds();
  const bounds =
    storedBounds ??
    getCenteredBounds(DEFAULT_WINDOW_BOUNDS.width, DEFAULT_WINDOW_BOUNDS.height);

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: Math.max(bounds.width, MIN_WINDOW_WIDTH),
    height: Math.max(bounds.height, MIN_WINDOW_HEIGHT),
    left: bounds.left,
    top: bounds.top,
    focused: true,
  });

  if (win?.id != null) {
    await setStoredWindowId(win.id);
  }
}

/**
 * Persist current window bounds. Call on bounds change.
 */
export async function persistWindowBounds(
  windowId: number
): Promise<void> {
  try {
    const win = await chrome.windows.get(windowId);
    if (
      win.width != null &&
      win.height != null &&
      win.left != null &&
      win.top != null
    ) {
      await setStoredBounds({
        width: win.width,
        height: win.height,
        left: win.left,
        top: win.top,
      });
    }
  } catch {
    // Window may have been closed
  }
}

/**
 * Clear stored window id when the app window is closed.
 */
export async function handleWindowRemoved(windowId: number): Promise<void> {
  const stored = await getStoredWindowId();
  if (stored === windowId) {
    await setStoredWindowId(null);
  }
}

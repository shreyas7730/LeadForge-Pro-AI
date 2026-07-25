/**
 * Background Service Worker — Phase 1
 * Responsibilities: single-instance window launch, bounds persistence.
 * Messaging, queue, extraction arrive in later phases.
 */

import {
  handleWindowRemoved,
  launchAppWindow,
  persistWindowBounds,
} from '@/services/window-service';

// Extension icon click → open / focus the desktop window
chrome.action.onClicked.addListener(() => {
  void launchAppWindow();
});

// Persist bounds when the user resizes or moves the window
chrome.windows.onBoundsChanged.addListener((window) => {
  if (window.id != null) {
    void persistWindowBounds(window.id);
  }
});

// Clear stored window id when closed
chrome.windows.onRemoved.addListener((windowId) => {
  void handleWindowRemoved(windowId);
});

// Optional: open window on install for first-run experience (Phase 1 keeps it simple)
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void launchAppWindow();
  }
});

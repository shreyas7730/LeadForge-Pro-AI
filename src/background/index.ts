/**
 * Background Service Worker — Phase 2
 * Window management + typed message routing.
 * Extraction orchestration arrives in Phase 3.
 */

import {
  handleWindowRemoved,
  launchAppWindow,
  persistWindowBounds,
} from '@/services/window-service';
import { onMessage, createMessage } from '@/messaging';
import { openDatabase } from '@/database';
import { logger } from '@/services/logger-service';
import { settingsService } from '@/services/settings-service';
import { APP_VERSION } from '@/constants';
import type { ExtractionTask } from '@/types/domain';

// ─── Window lifecycle (Phase 1 preserved) ───────────────────────

chrome.action.onClicked.addListener(() => {
  void launchAppWindow();
});

chrome.windows.onBoundsChanged.addListener((window) => {
  if (window.id != null) {
    void persistWindowBounds(window.id);
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  void handleWindowRemoved(windowId);
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void launchAppWindow();
  }
  logger.info(`Extension ${details.reason}`, {
    category: 'system',
    context: { reason: details.reason },
  });
});

// ─── Database bootstrap ─────────────────────────────────────────

void openDatabase()
  .then(() => {
    logger.info('Background database ready', { category: 'storage' });
  })
  .catch((err: unknown) => {
    logger.error('Background database failed', {
      category: 'storage',
      context: { error: String(err) },
    });
  });

// ─── Typed message router ───────────────────────────────────────

onMessage({
  WINDOW_READY: async (message) => {
    logger.debug('WINDOW_READY received', {
      category: 'messaging',
      correlationId: message.correlationId,
    });
    return createMessage(
      'WINDOW_ACK',
      { ok: true },
      { correlationId: message.correlationId }
    );
  },

  PING: async (message) => {
    return createMessage(
      'PONG',
      { ok: true },
      { correlationId: message.correlationId }
    );
  },

  GET_STATE: async (message) => {
    const theme = await settingsService.getTheme();
    // Session/tasks populated in Phase 3; return empty infrastructure shape now
    const tasks: ExtractionTask[] = [];
    return createMessage(
      'STATE_SNAPSHOT',
      {
        session: null,
        tasks,
        theme,
      },
      { correlationId: message.correlationId }
    );
  },

  LOG_ENTRY: async (message) => {
    const entry = message.payload.entry;
    if (entry.level === 'error' || entry.level === 'fatal') {
      logger.error(entry.message, {
        category: entry.category,
        correlationId: entry.correlationId,
        sessionId: entry.sessionId,
        context: entry.context,
      });
    } else if (entry.level === 'warn') {
      logger.warn(entry.message, {
        category: entry.category,
        correlationId: entry.correlationId,
      });
    } else {
      logger.info(entry.message, {
        category: entry.category,
        correlationId: entry.correlationId,
      });
    }
  },

  // Phase 3 will handle START/PAUSE/RESUME/CANCEL_SESSION
  START_SESSION: async (message) => {
    logger.warn('START_SESSION received but extraction is Phase 3', {
      category: 'messaging',
      correlationId: message.correlationId,
    });
    return createMessage(
      'ERROR',
      {
        code: 'UNKNOWN',
        message: 'Extraction engine is not available until Phase 3',
      },
      { correlationId: message.correlationId }
    );
  },
});

logger.info(`LeadForge Pro AI background ready (v${APP_VERSION})`, {
  category: 'system',
});

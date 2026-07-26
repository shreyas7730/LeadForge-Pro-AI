/**
 * Background Service Worker — Phase 3
 * Window management + messaging + extraction orchestration.
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
import { extractionService } from '@/services/extraction-service';
import { extractionEngine } from '@/services/extraction-engine';
import { crawlerService } from '@/services/crawler-service';
import { DEFAULT_EXTRACTION_SETTINGS } from '@/types/domain';
import { APP_VERSION } from '@/constants';
import { toAppError } from '@/utils/errors';

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

void openDatabase()
  .then(async () => {
    logger.info('Background database ready', { category: 'storage' });
    const recovered = await extractionService.recover();
    if (recovered) {
      logger.info('Recovered extraction session (paused)', {
        category: 'queue',
        sessionId: recovered.sessionId,
      });
    }
    await crawlerService.recover();
  })
  .catch((err: unknown) => {
    logger.error('Background database failed', {
      category: 'storage',
      context: { error: String(err) },
    });
  });

onMessage({
  WINDOW_READY: async (message) => {
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
    const engine = extractionEngine.getState();
    return createMessage(
      'STATE_SNAPSHOT',
      {
        session: engine.session,
        tasks: engine.tasks,
        theme,
      },
      { correlationId: message.correlationId }
    );
  },

  START_SESSION: async (message) => {
    try {
      const { keywords, locations, settings, name } = message.payload;
      const result = await extractionService.start({
        keywords,
        locations,
        settings: {
          ...DEFAULT_EXTRACTION_SETTINGS,
          ...settings,
        },
        name,
      });
      return createMessage(
        'SESSION_STATUS',
        {
          sessionId: result.sessionId,
          status: 'running',
          totalBusinesses: 0,
          totalEmails: 0,
        },
        { correlationId: message.correlationId }
      );
    } catch (err) {
      const appErr = toAppError(err);
      return createMessage(
        'ERROR',
        { code: appErr.code, message: appErr.message },
        { correlationId: message.correlationId }
      );
    }
  },

  PAUSE_SESSION: async (message) => {
    try {
      await extractionService.pause(message.payload.sessionId);
      return createMessage(
        'SESSION_STATUS',
        {
          sessionId: message.payload.sessionId,
          status: 'paused',
          totalBusinesses:
            extractionEngine.getState().session?.totalBusinesses ?? 0,
          totalEmails: 0,
        },
        { correlationId: message.correlationId }
      );
    } catch (err) {
      const appErr = toAppError(err);
      return createMessage(
        'ERROR',
        { code: appErr.code, message: appErr.message },
        { correlationId: message.correlationId }
      );
    }
  },

  RESUME_SESSION: async (message) => {
    try {
      await extractionService.resume(message.payload.sessionId);
      return createMessage(
        'SESSION_STATUS',
        {
          sessionId: message.payload.sessionId,
          status: 'running',
          totalBusinesses:
            extractionEngine.getState().session?.totalBusinesses ?? 0,
          totalEmails: 0,
        },
        { correlationId: message.correlationId }
      );
    } catch (err) {
      const appErr = toAppError(err);
      return createMessage(
        'ERROR',
        { code: appErr.code, message: appErr.message },
        { correlationId: message.correlationId }
      );
    }
  },

  CANCEL_SESSION: async (message) => {
    try {
      await extractionService.cancel(message.payload.sessionId);
      return createMessage(
        'SESSION_STATUS',
        {
          sessionId: message.payload.sessionId,
          status: 'cancelled',
          totalBusinesses:
            extractionEngine.getState().session?.totalBusinesses ?? 0,
          totalEmails: 0,
        },
        { correlationId: message.correlationId }
      );
    } catch (err) {
      const appErr = toAppError(err);
      return createMessage(
        'ERROR',
        { code: appErr.code, message: appErr.message },
        { correlationId: message.correlationId }
      );
    }
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

  CONTENT_READY: async (message) => {
    logger.debug('Content script ready', {
      category: 'parser',
      context: { url: message.payload.url },
    });
  },
});

logger.info(`LeadForge Pro AI background ready (v${APP_VERSION})`, {
  category: 'system',
});

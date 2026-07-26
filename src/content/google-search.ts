/**
 * Content script — Google Search pages.
 * Responds to PARSE_PAGE from the background service worker.
 */

import { parseSearchPage } from './parser/search-results-parser';
import type {
  AnyMessage,
  MessageEnvelope,
  MessagePayloadMap,
} from '@/types/messages';

function isEnvelope(value: unknown): value is AnyMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v['type'] === 'string' && typeof v['correlationId'] === 'string';
}

function respond<T extends keyof MessagePayloadMap>(
  type: T,
  payload: MessagePayloadMap[T],
  correlationId: string
): MessageEnvelope<T> {
  return {
    type,
    payload,
    correlationId,
    timestamp: Date.now(),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isEnvelope(message)) return false;

  if (message.type === 'PARSE_PAGE') {
    // Discriminated union narrows payload to PARSE_PAGE fields
    const { taskId, sessionId } = message.payload;
    try {
      const parsed = parseSearchPage(document);
      const payload: MessagePayloadMap['PARSE_RESULT'] = {
        taskId,
        sessionId,
        candidates: parsed.candidates,
        hasNextPage: parsed.hasNextPage,
        nextStart: parsed.nextStart,
        pageStart: parsed.pageStart,
      };
      sendResponse(respond('PARSE_RESULT', payload, message.correlationId));
    } catch (err) {
      sendResponse(
        respond(
          'PARSE_RESULT',
          {
            taskId,
            sessionId,
            candidates: [],
            hasNextPage: false,
            nextStart: 0,
            pageStart: 0,
            error: err instanceof Error ? err.message : String(err),
          },
          message.correlationId
        )
      );
    }
    return true;
  }

  if (message.type === 'PING') {
    sendResponse(respond('PONG', { ok: true }, message.correlationId));
    return true;
  }

  return false;
});

// Announce readiness (best-effort)
try {
  void chrome.runtime.sendMessage({
    type: 'CONTENT_READY',
    correlationId: crypto.randomUUID(),
    timestamp: Date.now(),
    payload: { url: location.href },
  } satisfies MessageEnvelope<'CONTENT_READY'>);
} catch {
  // background may not be listening
}

/**
 * Typed Chrome runtime messaging — Phase 2.
 * Promise-based send + typed listeners. No `any`.
 */

import type {
  AnyMessage,
  MessageEnvelope,
  MessageError,
  MessagePayloadMap,
  MessageType,
} from '@/types/messages';
import { generateCorrelationId } from '@/utils/id';
import { AppError, type ErrorCode } from '@/utils/errors';
import { TIMEOUTS } from '@/constants';

const ERROR_CODES: readonly ErrorCode[] = [
  'UNKNOWN',
  'VALIDATION',
  'STORAGE',
  'MESSAGING',
  'TIMEOUT',
  'ABORTED',
  'NOT_FOUND',
  'QUOTA',
  'PERMISSION',
  'NETWORK',
] as const;

function toErrorCode(code: string): ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(code)
    ? (code as ErrorCode)
    : 'MESSAGING';
}

export function createMessage<T extends MessageType>(
  type: T,
  payload: MessagePayloadMap[T],
  options?: { correlationId?: string; traceId?: string }
): MessageEnvelope<T> {
  return {
    type,
    payload,
    correlationId: options?.correlationId ?? generateCorrelationId(),
    timestamp: Date.now(),
    traceId: options?.traceId,
  };
}

function isMessageEnvelope(value: unknown): value is AnyMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['type'] === 'string' &&
    typeof v['correlationId'] === 'string' &&
    typeof v['timestamp'] === 'number' &&
    'payload' in v
  );
}

export type MessageHandler<T extends MessageType = MessageType> = (
  message: MessageEnvelope<T>,
  sender: chrome.runtime.MessageSender
) => void | Promise<void | MessageEnvelope<MessageType> | MessageError>;

type HandlerMap = {
  [K in MessageType]?: MessageHandler<K>;
};

/**
 * Register typed message handlers. Returns an unsubscribe function.
 * Safe to call from background or extension pages.
 */
export function onMessage(handlers: HandlerMap): () => void {
  const listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean => {
    if (!isMessageEnvelope(message)) {
      sendResponse({
        type: 'ERROR',
        correlationId: generateCorrelationId(),
        timestamp: Date.now(),
        payload: { code: 'VALIDATION', message: 'Invalid message envelope' },
      } satisfies MessageEnvelope<'ERROR'>);
      return false;
    }

    const handler = handlers[message.type] as MessageHandler | undefined;
    if (!handler) {
      return false;
    }

    void (async () => {
      try {
        const result = await handler(
          message as MessageEnvelope,
          sender
        );
        if (result !== undefined) {
          sendResponse(result);
        }
      } catch (err) {
        const appErr =
          err instanceof AppError
            ? err
            : new AppError('MESSAGING', String(err));
        sendResponse(
          createMessage('ERROR', {
            code: appErr.code,
            message: appErr.message,
            details: appErr.details,
          }, { correlationId: message.correlationId })
        );
      }
    })();

    // Keep channel open for async response
    return true;
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/**
 * Send a typed message and optionally wait for a typed response.
 */
export async function sendMessage<
  TReq extends MessageType,
  TRes extends MessageType = MessageType,
>(
  type: TReq,
  payload: MessagePayloadMap[TReq],
  options?: {
    timeoutMs?: number;
    expectedResponseType?: TRes;
  }
): Promise<MessageEnvelope<TRes> | void> {
  const envelope = createMessage(type, payload);
  const timeoutMs = options?.timeoutMs ?? TIMEOUTS.messageMs;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AppError('TIMEOUT', `Message ${type} timed out after ${timeoutMs}ms`)
      );
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(envelope, (response: unknown) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(
            new AppError('MESSAGING', chrome.runtime.lastError.message ?? 'sendMessage failed')
          );
          return;
        }
        if (response === undefined || response === null) {
          resolve(undefined);
          return;
        }
        if (!isMessageEnvelope(response)) {
          reject(new AppError('VALIDATION', 'Invalid response envelope'));
          return;
        }
        if (response.type === 'ERROR') {
          const errPayload = response.payload as MessagePayloadMap['ERROR'];
          reject(
            new AppError(toErrorCode(errPayload.code), errPayload.message, {
              details: errPayload.details,
            })
          );
          return;
        }
        if (
          options?.expectedResponseType &&
          response.type !== options.expectedResponseType
        ) {
          reject(
            new AppError(
              'VALIDATION',
              `Expected response ${options.expectedResponseType}, got ${response.type}`
            )
          );
          return;
        }
        resolve(response as MessageEnvelope<TRes>);
      });
    } catch (err) {
      clearTimeout(timer);
      reject(
        err instanceof AppError
          ? err
          : new AppError('MESSAGING', String(err), { cause: err })
      );
    }
  });
}

/** Fire-and-forget broadcast (no response expected). */
export function broadcastMessage<T extends MessageType>(
  type: T,
  payload: MessagePayloadMap[T]
): void {
  const envelope = createMessage(type, payload);
  try {
    void chrome.runtime.sendMessage(envelope);
  } catch {
    // Receiver may not be listening; ignore
  }
}

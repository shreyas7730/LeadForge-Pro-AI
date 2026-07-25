/** Typed application errors — Phase 2 */

export type ErrorCode =
  | 'UNKNOWN'
  | 'VALIDATION'
  | 'STORAGE'
  | 'MESSAGING'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'NOT_FOUND'
  | 'QUOTA'
  | 'PERMISSION'
  | 'NETWORK';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly recoverable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { details?: unknown; recoverable?: boolean; cause?: unknown }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = options?.details;
    this.recoverable = options?.recoverable ?? true;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new AppError('ABORTED', 'Operation was cancelled', {
      recoverable: true,
      cause: err,
    });
  }
  if (err instanceof Error) {
    return new AppError('UNKNOWN', err.message, {
      recoverable: true,
      cause: err,
    });
  }
  return new AppError('UNKNOWN', String(err), { recoverable: true });
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

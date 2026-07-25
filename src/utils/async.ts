/** Async helpers — Phase 2 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let last = 0;
  let pending: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = limitMs - (now - last);
    if (remaining <= 0) {
      if (pending) {
        clearTimeout(pending);
        pending = undefined;
      }
      last = now;
      fn(...args);
    } else if (!pending) {
      pending = setTimeout(() => {
        last = Date.now();
        pending = undefined;
        fn(...args);
      }, remaining);
    }
  };
}

export interface RetryOptions {
  retries: number;
  delayMs: number;
  backoff?: number;
  signal?: AbortSignal;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { retries, delayMs, backoff = 2, signal } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      await sleep(delayMs * Math.pow(backoff, attempt));
    }
  }
  throw lastError;
}

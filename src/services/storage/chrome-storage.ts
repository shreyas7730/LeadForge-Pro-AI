/**
 * Typed chrome.storage.local facade — Phase 2.
 * For small settings / window state only.
 */

import { AppError } from '@/utils/errors';

export async function chromeStorageGet<T>(
  key: string
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve(undefined);
        return;
      }
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime?.lastError) {
          reject(
            new AppError('STORAGE', chrome.runtime.lastError.message ?? 'get failed')
          );
          return;
        }
        resolve(result[key] as T | undefined);
      });
    } catch (err) {
      reject(new AppError('STORAGE', String(err), { cause: err }));
    }
  });
}

export async function chromeStorageSet(
  key: string,
  value: unknown
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // ignore
        }
        resolve();
        return;
      }
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) {
          reject(
            new AppError('STORAGE', chrome.runtime.lastError.message ?? 'set failed')
          );
          return;
        }
        resolve();
      });
    } catch (err) {
      reject(new AppError('STORAGE', String(err), { cause: err }));
    }
  });
}

export async function chromeStorageRemove(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        resolve();
        return;
      }
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime?.lastError) {
          reject(
            new AppError(
              'STORAGE',
              chrome.runtime.lastError.message ?? 'remove failed'
            )
          );
          return;
        }
        resolve();
      });
    } catch (err) {
      reject(new AppError('STORAGE', String(err), { cause: err }));
    }
  });
}

/**
 * TabManager — single reusable Google Search tab for extraction.
 * Phase 3.
 */

import { logger } from '@/services/logger-service';
import { sleep } from '@/utils/async';
import { AppError } from '@/utils/errors';
import { buildGoogleLocalSearchUrl } from '@/utils/string';

const EXTRACTION_TAB_KEY = 'leadforge_extraction_tab_id';

function storageArea(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

async function getStoredTabId(): Promise<number | null> {
  return new Promise((resolve) => {
    storageArea().get(EXTRACTION_TAB_KEY, (result) => {
      const id = result[EXTRACTION_TAB_KEY];
      resolve(typeof id === 'number' ? id : null);
    });
  });
}

async function setStoredTabId(id: number | null): Promise<void> {
  return new Promise((resolve) => {
    if (id === null) {
      storageArea().remove(EXTRACTION_TAB_KEY, () => resolve());
    } else {
      storageArea().set({ [EXTRACTION_TAB_KEY]: id }, () => resolve());
    }
  });
}

async function tabExists(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

function waitForComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new AppError('TIMEOUT', `Tab ${tabId} load timed out`));
    }, timeoutMs);

    function listener(
      updatedId: number,
      info: chrome.tabs.TabChangeInfo
    ): void {
      if (updatedId === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);

    void chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

export const tabManager = {
  async openSearch(query: string, pageStart = 0): Promise<number> {
    const url = buildGoogleLocalSearchUrl(query, pageStart);
    let tabId = await getStoredTabId();

    if (tabId !== null && !(await tabExists(tabId))) {
      tabId = null;
      await setStoredTabId(null);
    }

    if (tabId === null) {
      const tab = await chrome.tabs.create({ url, active: false });
      if (tab.id == null) {
        throw new AppError('UNKNOWN', 'Failed to create extraction tab');
      }
      tabId = tab.id;
      await setStoredTabId(tabId);
      logger.info('Extraction tab created', {
        category: 'parser',
        context: { tabId, query },
      });
    } else {
      await chrome.tabs.update(tabId, { url, active: false });
      logger.info('Extraction tab navigated', {
        category: 'parser',
        context: { tabId, query, pageStart },
      });
    }

    await waitForComplete(tabId, 30_000);
    await sleep(1200);
    return tabId;
  },

  async getTabId(): Promise<number | null> {
    const id = await getStoredTabId();
    if (id !== null && (await tabExists(id))) return id;
    return null;
  },

  async closeExtractionTab(): Promise<void> {
    const id = await getStoredTabId();
    if (id !== null) {
      try {
        await chrome.tabs.remove(id);
      } catch {
        // already closed
      }
      await setStoredTabId(null);
    }
  },
};

import { useEffect, type ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { bindNotificationStore } from '@/stores/notification-store';
import { openDatabase } from '@/database';
import { logger } from '@/services/logger-service';
import { toAppError } from '@/utils/errors';

/**
 * Root providers for the React app window.
 * Initializes IndexedDB and notification binding.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unbind = bindNotificationStore();

    void (async () => {
      try {
        await openDatabase();
        logger.info('Database opened', { category: 'storage' });
      } catch (err) {
        const appErr = toAppError(err);
        logger.error('Failed to open database', {
          category: 'storage',
          context: { message: appErr.message },
        });
      }
    })();

    return () => {
      unbind();
      void logger.flush();
    };
  }, []);

  return <QueryProvider>{children}</QueryProvider>;
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppProviders } from './providers/AppProviders';
import { hydrateTheme } from '@/stores/settings-store';
import { sendMessage } from '@/messaging';
import { logger } from '@/services/logger-service';
import { APP_VERSION } from '@/constants';
import '@/styles/globals.css';

hydrateTheme();

// Announce window readiness to the service worker (best-effort)
void sendMessage('WINDOW_READY', { version: APP_VERSION }).catch(() => {
  // Background may not be ready yet during first paint
});

logger.info('App window booting', { category: 'ui' });

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);

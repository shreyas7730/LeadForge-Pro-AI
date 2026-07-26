import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'LeadForge Pro AI',
  description: 'Enterprise business intelligence and lead extraction platform',
  version: '1.0.0',
  action: {
    default_title: 'LeadForge Pro AI',
    default_icon: {
      '16': 'public/icons/icon-16.png',
      '48': 'public/icons/icon-48.png',
      '128': 'public/icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  icons: {
    '16': 'public/icons/icon-16.png',
    '48': 'public/icons/icon-48.png',
    '128': 'public/icons/icon-128.png',
  },
  permissions: ['storage', 'tabs', 'windows', 'scripting'],
  host_permissions: [
    'https://www.google.com/*',
    'https://google.com/*',
    'http://*/*',
    'https://*/*',
  ],
  content_scripts: [
    {
      matches: [
        'https://www.google.com/search*',
        'https://google.com/search*',
      ],
      js: ['src/content/google-search.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['index.html', 'assets/*'],
      matches: ['<all_urls>'],
    },
  ],
});

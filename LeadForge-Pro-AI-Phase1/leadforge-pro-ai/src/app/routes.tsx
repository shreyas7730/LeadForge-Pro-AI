import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { DashboardPage } from './pages/Dashboard';
import { ExtractionPage } from './pages/Extraction';
import { QueuePage } from './pages/Queue';
import { ResultsPage } from './pages/Results';
import { AnalyticsPage } from './pages/Analytics';
import { ExportsPage } from './pages/Exports';
import { SettingsPage } from './pages/Settings';
import { LogsPage } from './pages/Logs';
import { HelpPage } from './pages/Help';
import { AboutPage } from './pages/About';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'extraction', element: <ExtractionPage /> },
      { path: 'queue', element: <QueuePage /> },
      { path: 'results', element: <ResultsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'exports', element: <ExportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'logs', element: <LogsPage /> },
      { path: 'help', element: <HelpPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

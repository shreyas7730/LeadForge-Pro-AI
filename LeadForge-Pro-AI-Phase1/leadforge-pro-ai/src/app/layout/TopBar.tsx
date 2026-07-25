import { useLocation } from 'react-router-dom';
import { Moon, Sun, Command } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/extraction': 'Extraction',
  '/queue': 'Queue',
  '/results': 'Results',
  '/analytics': 'Analytics',
  '/exports': 'Exports',
  '/settings': 'Settings',
  '/logs': 'Logs',
  '/help': 'Help',
  '/about': 'About',
};

export function TopBar() {
  const location = useLocation();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const title = PAGE_TITLES[location.pathname] ?? 'LeadForge Pro AI';

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const ThemeIcon = theme === 'light' ? Sun : Moon;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-app px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-heading text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        {/* Command palette trigger — functional in later phase */}
        <button
          type="button"
          className={cn(
            'flex h-8 items-center gap-2 rounded-md px-2.5 text-caption',
            'text-foreground-secondary transition-colors duration-fast',
            'hover:bg-elevated hover:text-foreground'
          )}
          aria-label="Open command palette"
          title="Command palette (⌘K)"
        >
          <Command className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">⌘K</span>
        </button>

        <button
          type="button"
          onClick={cycleTheme}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-foreground-secondary transition-colors duration-fast',
            'hover:bg-elevated hover:text-foreground'
          )}
          aria-label={`Theme: ${theme}. Click to cycle.`}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}

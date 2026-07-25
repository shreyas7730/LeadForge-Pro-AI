import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  ListOrdered,
  Table2,
  BarChart3,
  Download,
  Settings,
  ScrollText,
  HelpCircle,
  Info,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings-store';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/extraction', label: 'Extraction', icon: Search },
  { to: '/queue', label: 'Queue', icon: ListOrdered },
  { to: '/results', label: 'Results', icon: Table2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/exports', label: 'Exports', icon: Download },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/help', label: 'Help', icon: HelpCircle },
  { to: '/about', label: 'About', icon: Info },
] as const;

export function Sidebar() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-normal ease-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-12 items-center gap-3 border-b border-border px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald text-sm font-semibold text-white">
          L
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-body-medium text-foreground">
              LeadForge
            </div>
            <div className="truncate text-micro text-foreground-secondary">
              Pro AI
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-3 rounded-md px-3 text-caption transition-colors duration-fast',
                'text-foreground-secondary hover:bg-elevated hover:text-foreground',
                isActive &&
                  'bg-elevated text-foreground border-l-[3px] border-l-emerald pl-[9px]'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-caption text-foreground-secondary transition-colors duration-fast hover:bg-elevated hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

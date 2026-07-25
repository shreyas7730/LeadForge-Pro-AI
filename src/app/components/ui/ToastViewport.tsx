/**
 * Minimal toast viewport — Phase 2 infrastructure.
 * Renders notifications from the notification store.
 */

import { useNotificationStore } from '@/stores/notification-store';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
} as const;

const ACCENT = {
  success: 'border-l-success',
  warning: 'border-l-warning',
  info: 'border-l-info',
  error: 'border-l-danger',
} as const;

export function ToastViewport() {
  const items = useNotificationStore((s) => s.items);
  const dismiss = useNotificationStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100%-2rem,360px)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.slice(0, 3).map((n) => {
        const Icon = ICONS[n.type];
        return (
          <div
            key={n.id}
            className={cn(
              'pointer-events-auto flex gap-3 rounded-lg border border-border bg-card p-3 shadow-elev4',
              'border-l-[3px]',
              ACCENT[n.type]
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground-secondary" />
            <div className="min-w-0 flex-1">
              <div className="text-body-medium text-foreground">{n.title}</div>
              {n.message && (
                <div className="mt-0.5 text-caption text-foreground-secondary">
                  {n.message}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(n.id)}
              className="shrink-0 rounded p-0.5 text-foreground-tertiary hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

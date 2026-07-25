/**
 * NotificationService — in-app notification queue.
 * Phase 2. UI toast integration in later polish; store is ready now.
 */

import type { AppNotification, NotificationType } from '@/types/domain';
import { generateUUID } from '@/utils/id';
import { LIMITS } from '@/constants';
import { getDatabase } from '@/database';

type Listener = (notifications: AppNotification[]) => void;

class NotificationService {
  private queue: AppNotification[] = [];
  private listeners = new Set<Listener>();

  private emit(): void {
    const snapshot = [...this.queue];
    this.listeners.forEach((fn) => fn(snapshot));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => this.listeners.delete(listener);
  }

  push(
    type: NotificationType,
    title: string,
    options?: {
      message?: string;
      durationMs?: number;
      actionLabel?: string;
      actionHref?: string;
    }
  ): AppNotification {
    const notification: AppNotification = {
      id: generateUUID(),
      type,
      title,
      message: options?.message,
      createdAt: Date.now(),
      read: false,
      durationMs: options?.durationMs ?? (type === 'error' ? 8000 : 5000),
      actionLabel: options?.actionLabel,
      actionHref: options?.actionHref,
    };

    this.queue = [notification, ...this.queue].slice(
      0,
      LIMITS.maxNotificationsQueue
    );
    this.emit();

    // Persist asynchronously
    void getDatabase().notifications.put(notification).catch(() => {
      // non-critical
    });

    if (notification.durationMs && notification.durationMs > 0) {
      setTimeout(() => this.dismiss(notification.id), notification.durationMs);
    }

    return notification;
  }

  success(title: string, message?: string): AppNotification {
    return this.push('success', title, { message });
  }

  info(title: string, message?: string): AppNotification {
    return this.push('info', title, { message });
  }

  warning(title: string, message?: string): AppNotification {
    return this.push('warning', title, { message });
  }

  error(title: string, message?: string): AppNotification {
    return this.push('error', title, { message, durationMs: 8000 });
  }

  dismiss(id: string): void {
    this.queue = this.queue.filter((n) => n.id !== id);
    this.emit();
  }

  clear(): void {
    this.queue = [];
    this.emit();
  }

  getAll(): AppNotification[] {
    return [...this.queue];
  }
}

export const notificationService = new NotificationService();

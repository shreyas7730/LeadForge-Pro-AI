import { create } from 'zustand';
import type { AppNotification } from '@/types/domain';
import { notificationService } from '@/services/notification-service';

interface NotificationState {
  items: AppNotification[];
  setItems: (items: AppNotification[]) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  dismiss: (id) => {
    notificationService.dismiss(id);
  },
  clear: () => {
    notificationService.clear();
  },
}));

/** Subscribe once from the React tree. */
export function bindNotificationStore(): () => void {
  return notificationService.subscribe((items) => {
    useNotificationStore.getState().setItems(items);
  });
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  description?: string;
  duration?: number;
  icon?: React.ReactNode;
  action?: NotificationAction;
}

export interface NotificationContextType {
  notifications: Notification[];
  notify: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

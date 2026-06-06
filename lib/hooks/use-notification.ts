"use client";

import { useContext, useMemo } from "react";
import { NotificationContext } from "@/lib/contexts/notification-context";
import { NotificationType, NotificationAction } from "@/lib/types/notification";

interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: NotificationAction;
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }

  const { notify } = context;

  return useMemo(() => ({
    success: (message: string, options?: NotificationOptions | string) => {
      const opts = typeof options === "string" ? { title: options } : options;
      notify({ type: "success", message, ...opts, duration: opts?.duration ?? 3000 });
    },
    error: (message: string, options?: NotificationOptions | string) => {
      const opts = typeof options === "string" ? { title: options } : options;
      notify({ type: "error", message, ...opts, duration: opts?.duration ?? 3000 });
    },
    info: (message: string, options?: NotificationOptions | string) => {
      const opts = typeof options === "string" ? { title: options } : options;
      notify({ type: "info", message, ...opts, duration: opts?.duration ?? 3000 });
    },
    warning: (message: string, options?: NotificationOptions | string) => {
      const opts = typeof options === "string" ? { title: options } : options;
      notify({ type: "warning", message, ...opts, duration: opts?.duration ?? 3000 });
    },
    custom: (type: NotificationType, message: string, options?: NotificationOptions) =>
      notify({ type, message, ...options, duration: options?.duration ?? 3000 }),
  }), [notify]);
}

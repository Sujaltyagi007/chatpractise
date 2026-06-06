"use client";

import React, { useContext } from "react";
import { NotificationContext } from "@/lib/contexts/notification-context";
import { NotificationBanner } from "./notification-banner";

export function NotificationContainer() {
  const context = useContext(NotificationContext);

  if (!context) {
    return null;
  }

  const { notifications, removeNotification } = context;

  return (
    <div className="fixed top-0 left-0 right-0 md:top-4 md:right-4 md:left-auto z-50 p-4 md:p-0 pointer-events-none flex flex-col items-center md:items-end gap-1 w-full md:w-[380px]">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto w-full flex justify-center md:justify-end">
          <NotificationBanner
            notification={notification}
            onRemove={removeNotification}
          />
        </div>
      ))}
    </div>
  );
}

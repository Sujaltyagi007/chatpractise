"use client";

import React, { useContext, useState } from "react";
import { NotificationContext } from "@/lib/contexts/notification-context";
import { NotificationBanner } from "./notification-banner";

export function NotificationContainer() {
  const context = useContext(NotificationContext);
  const [isHovered, setIsHovered] = useState(false);

  if (!context) {
    return null;
  }

  const { notifications, removeNotification } = context;

  if (notifications.length === 0) {
    return null;
  }

  // Reverse so that the latest notification is at the top of the stack (index 0)
  const reversedNotifications = [...notifications].reverse();
  const totalCount = notifications.length;

  return (
    <div 
      className="fixed top-0 left-0 right-0 md:top-4 md:right-4 md:left-auto z-50 p-4 md:p-0 pointer-events-none flex flex-col items-center md:items-end gap-2 w-full md:w-[380px] transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {reversedNotifications.map((notification, index) => (
        <div key={notification.id} className="pointer-events-auto w-full flex justify-center md:justify-end">
          <NotificationBanner
            notification={notification}
            onRemove={removeNotification}
            indexFromTop={index}
            totalCount={totalCount}
            isHovered={isHovered}
          />
        </div>
      ))}
    </div>
  );
}


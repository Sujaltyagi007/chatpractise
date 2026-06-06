"use client";

import * as React from "react";
import { Suspense } from "react";
import { NotificationProvider } from "@/lib/contexts/notification-context";
import { NotificationContainer } from "@/components/notifications/notification-container";
import { UrlNotificationListener } from "@/components/ui/url-notification-listener";

export function AppNotificationProvider({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <>
        {children}
        <NotificationContainer />
        <Suspense fallback={null}>
          <UrlNotificationListener />
        </Suspense>
      </>
    </NotificationProvider>
  );
}

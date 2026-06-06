"use client";

import * as React from "react";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { UrlToastListener } from "@/components/ui/url-toast-listener";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors/>
      <Suspense fallback={null}>
        <UrlToastListener />
      </Suspense>
    </>
  );
}

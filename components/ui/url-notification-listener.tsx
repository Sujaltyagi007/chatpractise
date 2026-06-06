"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useNotification } from "@/lib/hooks/use-notification";

export function UrlNotificationListener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const notification = useNotification();

  useEffect(() => {
    const message = searchParams.get("message");
    const error = searchParams.get("error");
    const success = searchParams.get("success");

    if (message) {
      notification.success(message);
    } else if (success) {
      notification.success(success);
    } else if (error) {
      notification.error(error);
    }

    if (message || error || success) {
      // Clear the query parameters from the URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("message");
      params.delete("error");
      params.delete("success");
      const query = params.toString();
      const newUrl = pathname + (query ? `?${query}` : "");
      router.replace(newUrl);
    }
  }, [searchParams, pathname, router, notification]);

  return null;
}

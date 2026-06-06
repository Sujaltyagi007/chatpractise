"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { TOAST } from "@/lib/utils";

export function UrlToastListener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const message = searchParams.get("message");
    const error = searchParams.get("error");
    const success = searchParams.get("success");

    if (message) {
      toast.success(message, { style: TOAST.SUCCESS });
    } else if (success) {
      toast.success(success, { style: TOAST.SUCCESS });
    } else if (error) {
      toast.error(error, { style: TOAST.ERROR });
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
  }, [searchParams, pathname, router]);

  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageView, whenTrackerReady } from "@/lib/analytics";

export function PageViews() {
  const pathname = usePathname();
  useEffect(() => whenTrackerReady(trackPageView), [pathname]);
  return null;
}

"use client";

import { useEffect } from "react";
import { trackEvent, whenTrackerReady } from "@/lib/analytics";

export function TrackSignupConfirmed() {
  useEffect(() => whenTrackerReady(() => trackEvent("signup_confirmed")), []);
  return null;
}

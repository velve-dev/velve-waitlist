// Applies per-network limits to link, webhook and analytics routes.
import "server-only";
import { clientNetwork } from "./client-ip";
import type { Config } from "./config";
import { logEvent } from "./log";
import { anonymousKey, WindowLimiter, type LimitDecision } from "./rate-limit";

type LimitedGroup = "links" | "webhook" | "analytics";

const limiters = new Map<LimitedGroup, WindowLimiter>();

export function limitedGroupFor(pathname: string): LimitedGroup | null {
  if (pathname.startsWith("/api/webhooks/")) return "webhook";
  if (pathname === "/stats/api/send") return "analytics";
  if (
    pathname.startsWith("/confirm/") ||
    pathname.startsWith("/unsubscribe/") ||
    pathname.startsWith("/api/unsubscribe/")
  ) {
    return "links";
  }
  return null;
}

function groupLimit(group: LimitedGroup, { limits }: Config): [number, number] {
  switch (group) {
    case "links":
      return [limits.linkRequestsPerIp, limits.linkWindowSeconds];
    case "webhook":
      return [limits.webhookRequestsPerIp, limits.webhookWindowSeconds];
    case "analytics":
      return [limits.analyticsRequestsPerIp, limits.analyticsWindowSeconds];
  }
}

function limiterFor(group: LimitedGroup, config: Config): WindowLimiter {
  const existing = limiters.get(group);
  if (existing !== undefined) return existing;
  const [requests, windowSeconds] = groupLimit(group, config);
  const limiter = new WindowLimiter(requests, windowSeconds * 1000);
  limiters.set(group, limiter);
  return limiter;
}

export function checkLinkLimit(
  group: LimitedGroup,
  headers: Headers,
  config: Config,
  now: number,
): LimitDecision {
  const key = anonymousKey(clientNetwork(headers), config.rateLimitSaltSecret, now);
  const decision = limiterFor(group, config).hit(key, now);
  if (!decision.allowed) logEvent("link_rate_limited", group);
  return decision;
}

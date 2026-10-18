// Applies per-network limits to link and webhook routes.
import "server-only";
import { clientIp } from "./client-ip";
import type { Config } from "./config";
import { logEvent } from "./log";
import { anonymousKey, WindowLimiter, type LimitDecision } from "./rate-limit";

type LimitedGroup = "links" | "webhook";

const limiters = new Map<LimitedGroup, WindowLimiter>();

export function limitedGroupFor(pathname: string): LimitedGroup | null {
  if (pathname.startsWith("/api/webhooks/")) return "webhook";
  if (
    pathname.startsWith("/confirm/") ||
    pathname.startsWith("/unsubscribe/") ||
    pathname.startsWith("/api/unsubscribe/")
  ) {
    return "links";
  }
  return null;
}

function limiterFor(group: LimitedGroup, config: Config): WindowLimiter {
  const existing = limiters.get(group);
  if (existing !== undefined) return existing;
  const { limits } = config;
  const limiter =
    group === "links"
      ? new WindowLimiter(limits.linkRequestsPerIp, limits.linkWindowSeconds * 1000)
      : new WindowLimiter(limits.webhookRequestsPerIp, limits.webhookWindowSeconds * 1000);
  limiters.set(group, limiter);
  return limiter;
}

export function checkLinkLimit(
  group: LimitedGroup,
  headers: Headers,
  config: Config,
  now: number,
): LimitDecision {
  const key = anonymousKey(clientIp(headers), config.rateLimitSaltSecret, now);
  const decision = limiterFor(group, config).hit(key, now);
  if (!decision.allowed) logEvent("link_rate_limited", group);
  return decision;
}

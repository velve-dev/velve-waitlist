// In-memory fixed-window counters keyed by hashed identifiers.
import "server-only";
import { createHmac } from "node:crypto";

export type LimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const maxTrackedKeys = 100_000;

export class WindowLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  hit(key: string, now: number): LimitDecision {
    const current = this.windows.get(key);
    if (current === undefined || current.resetAt <= now) {
      this.remember(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true };
    }
    if (current.count >= this.limit) {
      return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
    }
    current.count += 1;
    return { allowed: true };
  }

  release(key: string) {
    const current = this.windows.get(key);
    if (current === undefined) return;
    if (current.count <= 1) this.windows.delete(key);
    else current.count -= 1;
  }

  private remember(key: string, window: { count: number; resetAt: number }) {
    this.windows.delete(key);
    if (this.windows.size >= maxTrackedKeys) {
      const oldest = this.windows.keys().next();
      if (!oldest.done) this.windows.delete(oldest.value);
    }
    this.windows.set(key, window);
  }
}

export class DailyCounter {
  private day = "";
  private count = 0;

  constructor(private readonly cap: number) {}

  peek(now: number): LimitDecision {
    this.rollOver(now);
    return this.count >= this.cap
      ? { allowed: false, retryAfterSeconds: secondsUntilNextUtcDay(now) }
      : { allowed: true };
  }

  take(now: number): LimitDecision {
    const decision = this.peek(now);
    if (decision.allowed) this.count += 1;
    return decision;
  }

  private rollOver(now: number) {
    const today = utcDay(now);
    if (today !== this.day) {
      this.day = today;
      this.count = 0;
    }
  }
}

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function secondsUntilNextUtcDay(now: number): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.ceil((next.getTime() - now) / 1000);
}

export function anonymousKey(value: string, secret: string, now: number): string {
  const dailySalt = createHmac("sha256", secret).update(utcDay(now)).digest();
  return createHmac("sha256", dailySalt).update(value).digest("base64url");
}

export function stableKey(value: string, secret: string): string {
  return createHmac("sha256", secret).update(`address:${value}`).digest("base64url");
}

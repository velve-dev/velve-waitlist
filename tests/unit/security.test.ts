import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createConfirmToken,
  createFormToken,
  createUnsubscribeToken,
  readConfirmToken,
  readFormTokenIssuedAt,
  readUnsubscribeToken,
} from "@/server/link-tokens";
import { anonymousKey, DailyCounter, stableKey, WindowLimiter } from "@/server/rate-limit";
import { ConfigError, readConfig } from "@/server/config";
import { testEnv } from "../support/services";

const key = randomBytes(32);
const otherKey = randomBytes(32);
const day = 86_400_000;
const claim = {
  email: "alex@company.com",
  firstName: "Alex",
  signedUpAt: Date.UTC(2026, 9, 18),
  consentVersion: "2026-10-18",
};

describe("link tokens", () => {
  it("round-trips a confirm claim without exposing the address", () => {
    const token = createConfirmToken(claim, key);
    expect(token).not.toContain("alex");
    expect(Buffer.from(token, "base64url").toString("latin1")).not.toContain("alex@company.com");
    expect(readConfirmToken(token, key, claim.signedUpAt + 1000, 604_800)).toEqual(claim);
  });

  it("rejects expired, future and foreign tokens", () => {
    const token = createConfirmToken(claim, key);
    expect(readConfirmToken(token, key, claim.signedUpAt + 7 * day + 1, 604_800)).toBeNull();
    expect(readConfirmToken(token, key, claim.signedUpAt - 1, 604_800)).toBeNull();
    expect(readConfirmToken(token, otherKey, claim.signedUpAt, 604_800)).toBeNull();
  });

  it("rejects a tampered token", () => {
    const token = createConfirmToken(claim, key);
    const bytes = Buffer.from(token, "base64url");
    bytes[20] = (bytes[20] ?? 0) ^ 1;
    expect(
      readConfirmToken(bytes.toString("base64url"), key, claim.signedUpAt, 604_800),
    ).toBeNull();
  });

  it("binds a token to its purpose", () => {
    const unsubscribe = createUnsubscribeToken(claim.email, key);
    expect(readUnsubscribeToken(unsubscribe, key)).toBe(claim.email);
    expect(readConfirmToken(unsubscribe, key, claim.signedUpAt, 604_800)).toBeNull();
    expect(readFormTokenIssuedAt(unsubscribe, key)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(readUnsubscribeToken("not a token", key)).toBeNull();
    expect(readUnsubscribeToken("", key)).toBeNull();
    expect(readUnsubscribeToken("A".repeat(5000), key)).toBeNull();
  });

  it("round-trips a form timestamp", () => {
    expect(readFormTokenIssuedAt(createFormToken(1234, key), key)).toBe(1234);
  });
});

describe("rate limits", () => {
  it("allows the limit and then asks to retry later", () => {
    const limiter = new WindowLimiter(2, 60_000);
    expect(limiter.hit("a", 0).allowed).toBe(true);
    expect(limiter.hit("a", 1).allowed).toBe(true);
    expect(limiter.hit("a", 2)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(limiter.hit("b", 2).allowed).toBe(true);
    expect(limiter.hit("a", 60_000).allowed).toBe(true);
  });

  it("caps sends per UTC day and resets at midnight", () => {
    const counter = new DailyCounter(1);
    const morning = Date.UTC(2026, 9, 18, 8);
    expect(counter.take(morning).allowed).toBe(true);
    expect(counter.peek(morning)).toEqual({ allowed: false, retryAfterSeconds: 16 * 3600 });
    expect(counter.take(Date.UTC(2026, 9, 19, 0, 0, 1)).allowed).toBe(true);
  });

  it("hashes addresses with a daily salt and never returns the raw value", () => {
    const today = anonymousKey("203.0.113.9", "secret", Date.UTC(2026, 9, 18, 1));
    expect(today).not.toContain("203.0.113.9");
    expect(anonymousKey("203.0.113.9", "secret", Date.UTC(2026, 9, 18, 23))).toBe(today);
    expect(anonymousKey("203.0.113.9", "secret", Date.UTC(2026, 9, 19, 1))).not.toBe(today);
    expect(stableKey("alex@company.com", "secret")).not.toContain("alex");
  });
});

describe("configuration", () => {
  it("reads defaults for every tunable", () => {
    const config = readConfig(testEnv);
    expect(config.limits).toEqual({
      dailySendCap: 150,
      signupsPerIp: 5,
      signupWindowSeconds: 600,
      confirmMailIntervalSeconds: 86_400,
      minFormSeconds: 1.5,
      linkRequestsPerIp: 30,
      answersPerIp: 10,
      answersWindowSeconds: 600,
      linkWindowSeconds: 600,
      webhookRequestsPerIp: 300,
      webhookWindowSeconds: 60,
      confirmTokenTtlSeconds: 604_800,
    });
    expect(config.siteIndexable).toBe(false);
    expect(config.umami).toBeNull();
  });

  it("reads tunables from the environment", () => {
    const config = readConfig({ ...testEnv, DAILY_SEND_CAP: "20", SIGNUP_LIMIT_PER_IP: "2" });
    expect(config.limits.dailySendCap).toBe(20);
    expect(config.limits.signupsPerIp).toBe(2);
  });

  it("names missing and invalid keys without their values", () => {
    const env: Record<string, string> = { ...testEnv, TOKEN_KEY: "short", DAILY_SEND_CAP: "-1" };
    delete env.BREVO_API_KEY;
    try {
      readConfig(env);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).invalidKeys.sort()).toEqual([
        "BREVO_API_KEY",
        "DAILY_SEND_CAP",
        "TOKEN_KEY",
      ]);
      expect((error as Error).message).not.toContain("short");
    }
  });

  it("needs both Umami values to enable analytics", () => {
    expect(readConfig({ ...testEnv, UMAMI_URL: "http://umami:3000" }).umami).toBeNull();
    expect(
      readConfig({ ...testEnv, UMAMI_URL: "http://umami:3000/", UMAMI_WEBSITE_ID: "abc" }).umami,
    ).toEqual({ url: "http://umami:3000", websiteId: "abc" });
  });
});

// Builds services with a fake Brevo for handler tests.
import { randomBytes } from "node:crypto";
import { readConfig, type Config } from "@/server/config";
import { DailyCounter, WindowLimiter } from "@/server/rate-limit";
import type { Services } from "@/server/services";

export const testEnv = {
  SITE_URL: "https://velve.test",
  BREVO_API_KEY: "test-brevo-api-key-0123456789",
  BREVO_LIST_ID: "7",
  BREVO_SENDER_EMAIL: "updates@velve.test",
  BREVO_SENDER_NAME: "Velve",
  BREVO_REPLY_TO: "hello@velve.test",
  BREVO_WEBHOOK_SECRET: "w".repeat(40),
  TOKEN_KEY: randomBytes(32).toString("base64"),
  RATE_LIMIT_SALT_SECRET: "s".repeat(40),
  CONSENT_VERSION: "2026-10-18",
  HEALTH_TOKEN: "h".repeat(40),
};

export type FakeBrevo = Services["brevo"] & {
  sent: Parameters<Services["brevo"]["sendMail"]>[0][];
  listed: Map<string, Record<string, unknown>>;
  deleted: string[];
  updated: Map<string, Record<string, string>>;
};

export function fakeBrevo(): FakeBrevo {
  const sent: FakeBrevo["sent"] = [];
  const listed = new Map<string, Record<string, unknown>>();
  const deleted: string[] = [];
  const updated = new Map<string, Record<string, string>>();
  return {
    sent,
    listed,
    deleted,
    updated,
    contactAttributes: (email) =>
      Promise.resolve(listed.has(email) ? { ...listed.get(email), ...updated.get(email) } : null),
    updateContact: (email, attributes) => {
      if (!listed.has(email)) return Promise.resolve("missing" as const);
      updated.set(email, attributes);
      return Promise.resolve("updated" as const);
    },
    sendMail: (mail) => {
      sent.push(mail);
      return Promise.resolve();
    },
    isOnList: (email) => Promise.resolve(listed.has(email)),
    addToList: (email, _listId, attributes) => {
      listed.set(email, attributes);
      return Promise.resolve();
    },
    deleteContact: (email) => {
      deleted.push(email);
      listed.delete(email);
      return Promise.resolve();
    },
    checkList: () => Promise.resolve(),
  };
}

export function testServices(
  overrides: { env?: Record<string, string>; now?: () => number } = {},
): Services & { brevo: FakeBrevo; deferred: Promise<void>[]; config: Config } {
  const config = readConfig({ ...testEnv, ...overrides.env });
  const deferred: Promise<void>[] = [];
  return {
    config,
    brevo: fakeBrevo(),
    signupsPerIp: new WindowLimiter(
      config.limits.signupsPerIp,
      config.limits.signupWindowSeconds * 1000,
    ),
    confirmMailsPerAddress: new WindowLimiter(1, config.limits.confirmMailIntervalSeconds * 1000),
    answersPerIp: new WindowLimiter(
      config.limits.answersPerIp,
      config.limits.answersWindowSeconds * 1000,
    ),
    sendCap: new DailyCounter(config.limits.dailySendCap),
    now: overrides.now ?? Date.now,
    defer: (task) => {
      deferred.push(task());
    },
    deferred,
  };
}

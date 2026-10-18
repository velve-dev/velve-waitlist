// Reads and validates every setting from the environment.
import "server-only";

export type Config = {
  siteUrl: string;
  siteIndexable: boolean;
  brevo: {
    apiUrl: string;
    apiKey: string;
    listId: number;
    senderEmail: string;
    senderName: string;
    replyTo: string;
    webhookSecret: string;
  };
  tokenKey: Buffer;
  rateLimitSaltSecret: string;
  consentVersion: string;
  healthToken: string;
  limits: {
    dailySendCap: number;
    signupsPerIp: number;
    signupWindowSeconds: number;
    confirmMailIntervalSeconds: number;
    minFormSeconds: number;
    linkRequestsPerIp: number;
    linkWindowSeconds: number;
    webhookRequestsPerIp: number;
    webhookWindowSeconds: number;
    confirmTokenTtlSeconds: number;
  };
  umami: { url: string; websiteId: string } | null;
};

export class ConfigError extends Error {
  constructor(readonly invalidKeys: string[]) {
    super(`invalid configuration: ${invalidKeys.join(", ")}`);
  }
}

type Env = Record<string, string | undefined>;

export function readConfig(env: Env): Config {
  const invalid: string[] = [];

  const text = (key: string, fallback?: string): string => {
    const value = env[key]?.trim() || fallback;
    if (value === undefined || value === "") {
      invalid.push(key);
      return "";
    }
    return value;
  };

  const positiveNumber = (key: string, fallback: number): number => {
    const raw = env[key]?.trim();
    if (raw === undefined || raw === "") return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      invalid.push(key);
      return fallback;
    }
    return value;
  };

  const httpsUrl = (key: string, fallback?: string): string => {
    const value = text(key, fallback);
    if (value === "") return value;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") invalid.push(key);
      return value.replace(/\/+$/, "");
    } catch {
      invalid.push(key);
      return "";
    }
  };

  const secret = (key: string, minLength: number): string => {
    const value = text(key);
    if (value !== "" && value.length < minLength) invalid.push(key);
    return value;
  };

  const tokenKey = Buffer.from(text("TOKEN_KEY"), "base64");
  if (tokenKey.length !== 32 && !invalid.includes("TOKEN_KEY")) invalid.push("TOKEN_KEY");

  const umamiUrl = env.UMAMI_URL?.trim() ?? "";
  const umamiWebsiteId = env.UMAMI_WEBSITE_ID?.trim() ?? "";

  const config: Config = {
    siteUrl: httpsUrl("SITE_URL"),
    siteIndexable: env.SITE_INDEXABLE?.trim() === "true",
    brevo: {
      apiUrl: httpsUrl("BREVO_API_URL", "https://api.brevo.com/v3"),
      apiKey: secret("BREVO_API_KEY", 16),
      listId: positiveNumber("BREVO_LIST_ID", 0),
      senderEmail: text("BREVO_SENDER_EMAIL"),
      senderName: text("BREVO_SENDER_NAME"),
      replyTo: text("BREVO_REPLY_TO"),
      webhookSecret: secret("BREVO_WEBHOOK_SECRET", 32),
    },
    tokenKey,
    rateLimitSaltSecret: secret("RATE_LIMIT_SALT_SECRET", 32),
    consentVersion: text("CONSENT_VERSION"),
    healthToken: secret("HEALTH_TOKEN", 32),
    limits: {
      dailySendCap: positiveNumber("DAILY_SEND_CAP", 150),
      signupsPerIp: positiveNumber("SIGNUP_LIMIT_PER_IP", 5),
      signupWindowSeconds: positiveNumber("SIGNUP_LIMIT_WINDOW_SECONDS", 600),
      confirmMailIntervalSeconds: positiveNumber("CONFIRM_MAIL_INTERVAL_SECONDS", 86_400),
      minFormSeconds: positiveNumber("MIN_FORM_SECONDS", 1.5),
      linkRequestsPerIp: positiveNumber("LINK_LIMIT_PER_IP", 30),
      linkWindowSeconds: positiveNumber("LINK_LIMIT_WINDOW_SECONDS", 600),
      webhookRequestsPerIp: positiveNumber("WEBHOOK_LIMIT_PER_IP", 300),
      webhookWindowSeconds: positiveNumber("WEBHOOK_LIMIT_WINDOW_SECONDS", 60),
      confirmTokenTtlSeconds: positiveNumber("CONFIRM_TOKEN_TTL_SECONDS", 604_800),
    },
    umami:
      umamiUrl !== "" && umamiWebsiteId !== ""
        ? { url: umamiUrl.replace(/\/+$/, ""), websiteId: umamiWebsiteId }
        : null,
  };

  if (config.brevo.listId === 0 && !invalid.includes("BREVO_LIST_ID"))
    invalid.push("BREVO_LIST_ID");
  if (invalid.length > 0) throw new ConfigError(invalid);
  return config;
}

let cached: Config | null = null;

export function getConfig(): Config {
  cached ??= readConfig(process.env);
  return cached;
}

// Wires configuration, limiters and the Brevo client once per process.
import "server-only";
import { after } from "next/server";
import { BrevoClient } from "./brevo";
import { getConfig, type Config } from "./config";
import { DailyCounter, WindowLimiter } from "./rate-limit";

export type Services = {
  config: Config;
  brevo: Pick<
    BrevoClient,
    | "sendMail"
    | "isOnList"
    | "addToList"
    | "updateContact"
    | "contactAttributes"
    | "deleteContact"
    | "checkList"
  >;
  signupsPerIp: WindowLimiter;
  confirmMailsPerAddress: WindowLimiter;
  answersPerIp: WindowLimiter;
  sendCap: DailyCounter;
  now: () => number;
  defer: (task: () => Promise<void>) => void;
};

const brevoTimeoutMs = 8000;
let services: Services | null = null;

export function getServices(): Services {
  if (services !== null) return services;
  const config = getConfig();
  services = {
    config,
    brevo: new BrevoClient({
      apiUrl: config.brevo.apiUrl,
      apiKey: config.brevo.apiKey,
      timeoutMs: brevoTimeoutMs,
    }),
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
    now: Date.now,
    defer: (task) => after(task),
  };
  return services;
}

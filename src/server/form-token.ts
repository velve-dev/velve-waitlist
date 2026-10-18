// Issues the timestamp token that slows down scripted sign-ups.
import "server-only";
import { ConfigError, getConfig } from "./config";
import { createFormToken } from "./link-tokens";
import { logEvent } from "./log";

export function issueFormToken(): string {
  try {
    return createFormToken(Date.now(), getConfig().tokenKey);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    logEvent("config_invalid", error.invalidKeys.join(","));
    return "";
  }
}

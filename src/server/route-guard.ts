// Runs handlers with services and hides every failure.
import "server-only";
import { ConfigError } from "./config";
import { logEvent } from "./log";
import { failed } from "./responses";
import { getServices, type Services } from "./services";

export async function withServices(
  handler: (services: Services) => Promise<Response>,
): Promise<Response> {
  try {
    return await handler(getServices());
  } catch (error) {
    logEvent(
      error instanceof ConfigError ? "config_invalid" : "unexpected_error",
      error instanceof ConfigError ? error.invalidKeys.join(",") : undefined,
    );
    return failed();
  }
}

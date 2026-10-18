// Reports liveness and, behind a token, the mail provider's reachability.
import "server-only";
import { timingSafeEqual } from "node:crypto";
import { BrevoClient } from "./brevo";
import { ConfigError, getConfig } from "./config";

const service = "velve-waitlist";
const dependencyTimeoutMs = 2000;

export function simpleHealth(): Response {
  return Response.json(
    { status: "ok", service, timestamp: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}

function bearerMatches(header: string | null, token: string): boolean {
  const given = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function detailedHealth(request: Request): Promise<Response> {
  const noStore = { "cache-control": "no-store" };
  const expectedToken = process.env.HEALTH_TOKEN?.trim() ?? "";
  if (
    expectedToken.length < 32 ||
    !bearerMatches(request.headers.get("authorization"), expectedToken)
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  let config;
  try {
    config = getConfig();
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    return Response.json(
      {
        status: "error",
        service,
        timestamp: new Date().toISOString(),
        checks: { configuration: "error", mail: "unknown" },
      },
      { status: 503, headers: noStore },
    );
  }

  const brevo = new BrevoClient({
    apiUrl: config.brevo.apiUrl,
    apiKey: config.brevo.apiKey,
    timeoutMs: dependencyTimeoutMs,
  });
  const mail = await brevo.checkList(config.brevo.listId).then(
    () => "ok" as const,
    () => "error" as const,
  );
  const status = mail === "ok" ? "ok" : "degraded";
  return Response.json(
    { status, service, timestamp: new Date().toISOString(), checks: { configuration: "ok", mail } },
    { status: 200, headers: noStore },
  );
}

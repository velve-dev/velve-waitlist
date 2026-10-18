// Relays Umami through our own origin without client addresses.
import "server-only";
import { analyticsEvents } from "@/lib/analytics";
import { readUmami } from "./config";
import { logEvent } from "./log";
import { readCappedText } from "./responses";

const scriptLifetimeMs = 60 * 60 * 1000;
const maxEventBytes = 16 * 1024;
const upstreamTimeoutMs = 3000;

function isAllowedEvent(body: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }
  if (typeof parsed !== "object" || parsed === null) return false;
  const { type, payload } = parsed as Record<string, unknown>;
  if (type !== "event" || typeof payload !== "object" || payload === null) return false;
  const { name, data } = payload as Record<string, unknown>;
  const isPageView = name === undefined;
  return (
    data === undefined &&
    (isPageView ||
      (typeof name === "string" && (analyticsEvents as readonly string[]).includes(name)))
  );
}

let cachedScript: { body: string; fetchedAt: number } | null = null;

export function umamiSettings() {
  return readUmami(process.env);
}

export async function serveTrackerScript(): Promise<Response> {
  const umami = umamiSettings();
  if (umami === null) return new Response(null, { status: 404 });
  const now = Date.now();
  if (cachedScript === null || now - cachedScript.fetchedAt > scriptLifetimeMs) {
    try {
      const response = await fetch(`${umami.url}/script.js`, {
        signal: AbortSignal.timeout(upstreamTimeoutMs),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`upstream_status_${response.status}`);
      cachedScript = { body: await response.text(), fetchedAt: now };
    } catch {
      logEvent("upstream_failed", "analytics_script_failed");
      if (cachedScript === null) return new Response(null, { status: 503 });
    }
  }
  return new Response(cachedScript.body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

export async function relayEvent(request: Request): Promise<Response> {
  const umami = umamiSettings();
  if (umami === null) return new Response(null, { status: 404 });
  const body = await readCappedText(request, maxEventBytes);
  if (body === null) return new Response(null, { status: 413 });
  if (!isAllowedEvent(body)) return new Response(null, { status: 400 });
  try {
    const response = await fetch(`${umami.url}/api/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": request.headers.get("user-agent") ?? "",
      },
      body,
      signal: AbortSignal.timeout(upstreamTimeoutMs),
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch {
    logEvent("upstream_failed", "analytics_send_failed");
    return new Response(null, { status: 502 });
  }
}

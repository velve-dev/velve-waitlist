// Relays Umami through our own origin without client addresses.
import "server-only";
import { readUmami } from "./config";
import { logEvent } from "./log";
import { readCappedText } from "./responses";

const scriptLifetimeMs = 60 * 60 * 1000;
const maxEventBytes = 16 * 1024;
const upstreamTimeoutMs = 3000;

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
    } catch (error) {
      logEvent("upstream_failed", error instanceof Error ? error.message : "analytics");
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
  } catch (error) {
    logEvent("upstream_failed", error instanceof Error ? error.message : "analytics");
    return new Response(null, { status: 502 });
  }
}

// Small JSON responses that never reveal internals.
import "server-only";

const noStore = { "cache-control": "no-store" };

export function jsonResponse(status: number, body: object, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...noStore, ...headers } });
}

export const accepted = () => jsonResponse(200, { ok: true });
export const failed = () => jsonResponse(500, { error: "failed" });
export const rateLimited = (retryAfterSeconds: number) =>
  jsonResponse(429, { error: "rate_limited" }, { "retry-after": String(retryAfterSeconds) });

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

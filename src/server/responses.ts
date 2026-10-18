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

async function readCappedBytes(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return null;
  if (request.body === null) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const bytes = await readCappedBytes(request, maxBytes);
  if (bytes === null) return null;
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

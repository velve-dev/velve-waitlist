// Picks the client address that Traefik appended to the request.
import "server-only";

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last !== undefined && last !== "" ? last : (headers.get("x-real-ip") ?? "unknown");
}

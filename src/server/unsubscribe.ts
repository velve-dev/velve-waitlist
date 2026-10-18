// Deletes contacts from links, one-click requests and Brevo webhooks.
import "server-only";
import { timingSafeEqual } from "node:crypto";
import { findEmailProblem, normaliseEmail } from "@/lib/email";
import { readUnsubscribeToken } from "./link-tokens";
import { logEvent } from "./log";
import { accepted, jsonResponse, readJsonBody } from "./responses";
import type { Services } from "./services";

const maxWebhookBytes = 256 * 1024;
const unsubscribeEvents = new Set(["unsubscribe", "unsubscribed"]);

export function isValidUnsubscribeToken(token: string, services: Services): boolean {
  return readUnsubscribeToken(token, services.config.tokenKey) !== null;
}

export async function handleUnsubscribe(token: string, services: Services): Promise<Response> {
  const email = readUnsubscribeToken(token, services.config.tokenKey);
  if (email === null) {
    logEvent("unsubscribe_link_invalid");
    return jsonResponse(400, { error: "invalid_link" });
  }
  await services.brevo.deleteContact(email);
  logEvent("contact_deleted", "link");
  return accepted();
}

function hasValidBearer(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function unsubscribedAddresses(body: unknown): string[] {
  const events = Array.isArray(body) ? body : [body];
  return events.flatMap((event) => {
    if (typeof event !== "object" || event === null) return [];
    const { event: name, email } = event as Record<string, unknown>;
    if (typeof name !== "string" || !unsubscribeEvents.has(name)) return [];
    if (typeof email !== "string" || findEmailProblem(email) !== null) return [];
    return [normaliseEmail(email)];
  });
}

export async function handleBrevoWebhook(request: Request, services: Services): Promise<Response> {
  if (!hasValidBearer(request, services.config.brevo.webhookSecret)) {
    logEvent("webhook_rejected");
    return jsonResponse(401, { error: "unauthorized" });
  }
  const body = await readJsonBody(request, maxWebhookBytes);
  for (const email of unsubscribedAddresses(body)) {
    await services.brevo.deleteContact(email);
    logEvent("contact_deleted", "webhook");
  }
  logEvent("webhook_processed");
  return accepted();
}

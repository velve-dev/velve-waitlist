// Stores the two optional answers as Brevo contact attributes.
import "server-only";
import { readAnswers } from "@/lib/questions";
import { BrevoError } from "./brevo";
import { clientNetwork } from "./client-ip";
import { readQuestionsToken } from "./link-tokens";
import { logEvent } from "./log";
import { anonymousKey } from "./rate-limit";
import { accepted, failed, jsonResponse, rateLimited, readJsonBody } from "./responses";
import type { Services } from "./services";

const maxBodyBytes = 2048;

function brevoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function wasStored(stored: Record<string, unknown>, attributes: Record<string, string>): boolean {
  return Object.entries(attributes).every(([name, value]) => {
    const storedValue = stored[name];
    return typeof storedValue === "string" && storedValue.startsWith(value);
  });
}

export async function handleAnswers(request: Request, services: Services): Promise<Response> {
  const { config } = services;
  const now = services.now();

  const networkKey = anonymousKey(clientNetwork(request.headers), config.rateLimitSaltSecret, now);
  const decision = services.answersPerIp.hit(networkKey, now);
  if (!decision.allowed) {
    logEvent("answers_rate_limited");
    return rateLimited(decision.retryAfterSeconds);
  }

  const body = await readJsonBody(request, maxBodyBytes);
  const token =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>).token : null;
  const email = typeof token === "string" ? readQuestionsToken(token, config.tokenKey) : null;
  if (email === null) {
    logEvent("answers_rejected", "invalid_link");
    return jsonResponse(400, { error: "invalid_link" });
  }
  const answers = readAnswers(body);
  if (answers === null) {
    logEvent("answers_rejected", "invalid_answer");
    return jsonResponse(400, { error: "invalid_answer" });
  }

  const attributes = {
    FIRST_DEPLOY: answers.firstDeploy,
    RUNS_ON: answers.runsOn,
    ANSWERED_AT: brevoDate(now),
  };
  try {
    const update = await services.brevo.updateContact(email, attributes);
    const stored = await services.brevo.contactAttributes(email);
    if (update === "missing" || stored === null) {
      logEvent("answers_contact_missing");
      return accepted();
    }
    if (!wasStored(stored, attributes)) {
      logEvent("answers_failed", "answers_attribute_missing");
      return failed();
    }
    logEvent("answers_saved");
    return accepted();
  } catch (error) {
    logEvent("answers_failed", error instanceof BrevoError ? error.code : "unknown");
    return failed();
  }
}

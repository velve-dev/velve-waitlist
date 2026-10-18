// Accepts a waitlist sign-up and sends the confirmation email.
import "server-only";
import { buildConfirmMail, siteLinks } from "../../emails/mails.ts";
import { findEmailProblem, mailboxIdentity, normaliseEmail } from "@/lib/email";
import { cleanFirstName, greetingFor } from "@/lib/name";
import { BrevoError } from "./brevo";
import { clientNetwork } from "./client-ip";
import { createConfirmToken, readFormTokenIssuedAt } from "./link-tokens";
import { logEvent } from "./log";
import { anonymousKey, stableKey } from "./rate-limit";
import { accepted, jsonResponse, rateLimited, readJsonBody } from "./responses";
import type { Services } from "./services";

const maxBodyBytes = 4096;

type SignupFields = { email: string; name: string; website: string; formToken: string };

function readFields(body: unknown): SignupFields | null {
  if (typeof body !== "object" || body === null) return null;
  const { email, name, website, formToken } = body as Record<string, unknown>;
  if (typeof email !== "string") return null;
  return {
    email,
    name: typeof name === "string" ? name : "",
    website: typeof website === "string" ? website : "",
    formToken: typeof formToken === "string" ? formToken : "",
  };
}

function looksAutomated(fields: SignupFields, services: Services, now: number): boolean {
  if (fields.website !== "") return true;
  const issuedAt = readFormTokenIssuedAt(fields.formToken, services.config.tokenKey);
  if (issuedAt === null) return true;
  return now - issuedAt < services.config.limits.minFormSeconds * 1000 || issuedAt > now;
}

export async function handleSignup(request: Request, services: Services): Promise<Response> {
  const now = services.now();
  const { config } = services;

  const capState = services.sendCap.peek(now);
  if (!capState.allowed) {
    logEvent("send_cap_reached");
    return rateLimited(capState.retryAfterSeconds);
  }

  const ipKey = anonymousKey(clientNetwork(request.headers), config.rateLimitSaltSecret, now);
  const ipDecision = services.signupsPerIp.hit(ipKey, now);
  if (!ipDecision.allowed) {
    logEvent("signup_rate_limited");
    return rateLimited(ipDecision.retryAfterSeconds);
  }

  const fields = readFields(await readJsonBody(request, maxBodyBytes));
  if (fields === null) return jsonResponse(400, { error: "missing" });
  const problem = findEmailProblem(fields.email);
  if (problem !== null) return jsonResponse(400, { error: problem });

  if (looksAutomated(fields, services, now)) {
    logEvent("signup_suppressed", "bot_check");
    return accepted();
  }

  const capBeforeSend = services.sendCap.peek(now);
  if (!capBeforeSend.allowed) {
    logEvent("send_cap_reached");
    return rateLimited(capBeforeSend.retryAfterSeconds);
  }

  const email = normaliseEmail(fields.email);
  const mailboxKey = stableKey(mailboxIdentity(email), config.rateLimitSaltSecret);
  const addressDecision = services.confirmMailsPerAddress.hit(mailboxKey, now);
  if (!addressDecision.allowed) {
    logEvent("signup_suppressed", "address_interval");
    return accepted();
  }

  services.sendCap.take(now);
  logEvent("signup_accepted");
  services.defer(() => sendConfirmation(email, fields.name, now, mailboxKey, services));
  return accepted();
}

async function sendConfirmation(
  email: string,
  rawName: string,
  now: number,
  mailboxKey: string,
  services: Services,
) {
  const { config } = services;
  const firstName = cleanFirstName(rawName);
  const token = createConfirmToken(
    { email, firstName, signedUpAt: now, consentVersion: config.consentVersion },
    config.tokenKey,
  );
  const mail = buildConfirmMail(
    greetingFor(firstName, email),
    `${config.siteUrl}/confirm/${token}`,
    siteLinks(config.siteUrl),
  );
  try {
    await services.brevo.sendMail({
      to: { email },
      sender: { email: config.brevo.senderEmail, name: config.brevo.senderName },
      replyTo: config.brevo.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tag: "confirm",
    });
    logEvent("confirm_mail_sent");
  } catch (error) {
    services.confirmMailsPerAddress.release(mailboxKey);
    logEvent("confirm_mail_failed", error instanceof BrevoError ? error.code : "unknown");
  }
}

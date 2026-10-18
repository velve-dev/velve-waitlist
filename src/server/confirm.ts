// Turns a confirmation link into a listed contact.
import "server-only";
import { buildWelcomeMail, siteLinks } from "../../emails/mails.ts";
import { greetingFor } from "@/lib/name";
import { BrevoError } from "./brevo";
import { createUnsubscribeToken, readConfirmToken } from "./link-tokens";
import { logEvent } from "./log";
import type { Services } from "./services";

export type ConfirmOutcome =
  { kind: "confirmed"; firstName: string } | { kind: "alreadyListed" } | { kind: "invalidLink" };

function brevoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export async function confirmSignup(token: string, services: Services): Promise<ConfirmOutcome> {
  const { config } = services;
  const now = services.now();
  const claim = readConfirmToken(token, config.tokenKey, now, config.limits.confirmTokenTtlSeconds);
  if (claim === null) {
    logEvent("confirm_link_invalid");
    return { kind: "invalidLink" };
  }

  if (await services.brevo.isOnList(claim.email, config.brevo.listId)) {
    logEvent("contact_already_listed");
    return { kind: "alreadyListed" };
  }

  const greeting = greetingFor(claim.firstName, claim.email);
  await services.brevo.addToList(claim.email, config.brevo.listId, {
    ...(claim.firstName === "" ? {} : { FIRSTNAME: claim.firstName }),
    GREETING: greeting,
    SIGNUP_AT: brevoDate(claim.signedUpAt),
    CONFIRMED_AT: brevoDate(now),
    CONSENT_VERSION: claim.consentVersion,
  });
  logEvent("contact_confirmed");
  services.defer(() => sendWelcome(claim.email, greeting, services));
  return { kind: "confirmed", firstName: claim.firstName };
}

async function sendWelcome(email: string, greeting: string, services: Services) {
  const { config } = services;
  if (!services.sendCap.take(services.now()).allowed) {
    logEvent("send_cap_reached", "welcome");
    return;
  }
  const unsubscribeUrl = `${config.siteUrl}/unsubscribe/${createUnsubscribeToken(email, config.tokenKey)}`;
  const mail = buildWelcomeMail(greeting, unsubscribeUrl, siteLinks(config.siteUrl));
  try {
    await services.brevo.sendMail({
      to: { email },
      sender: { email: config.brevo.senderEmail, name: config.brevo.senderName },
      replyTo: config.brevo.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tag: "welcome",
    });
    logEvent("welcome_mail_sent");
  } catch (error) {
    logEvent("welcome_mail_failed", error instanceof BrevoError ? error.code : "unknown");
  }
}

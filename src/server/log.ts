// Writes privacy-safe structured event lines to stdout.
import "server-only";

export type LogEvent =
  | "signup_accepted"
  | "signup_suppressed"
  | "signup_rate_limited"
  | "send_cap_reached"
  | "confirm_mail_sent"
  | "confirm_mail_failed"
  | "contact_confirmed"
  | "contact_already_listed"
  | "confirm_link_invalid"
  | "welcome_mail_sent"
  | "welcome_mail_failed"
  | "contact_deleted"
  | "unsubscribe_link_invalid"
  | "unsubscribe_failed"
  | "webhook_rejected"
  | "webhook_processed"
  | "link_rate_limited"
  | "answers_saved"
  | "answers_contact_missing"
  | "answers_rejected"
  | "answers_rate_limited"
  | "answers_failed"
  | "config_invalid"
  | "upstream_failed"
  | "unexpected_error";

export function logEvent(event: LogEvent, code?: string) {
  const line = { time: new Date().toISOString(), event, ...(code === undefined ? {} : { code }) };
  process.stdout.write(`${JSON.stringify(line)}\n`);
}

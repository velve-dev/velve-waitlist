// Typed confirm, unsubscribe and form tokens on top of sealing.
import "server-only";
import { openToken, sealToken } from "./tokens";

export type SignupClaim = {
  email: string;
  firstName: string;
  signedUpAt: number;
  consentVersion: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function servesPurpose(payload: Record<string, unknown>, purpose: string): boolean {
  return payload.p === undefined || payload.p === purpose;
}

export function createConfirmToken(claim: SignupClaim, key: Buffer): string {
  return sealToken(
    "confirm",
    {
      p: "confirm",
      e: claim.email,
      n: claim.firstName,
      t: claim.signedUpAt,
      c: claim.consentVersion,
    },
    key,
  );
}

export function readConfirmToken(
  token: string,
  key: Buffer,
  now: number,
  ttlSeconds: number,
): SignupClaim | null {
  const payload = openToken("confirm", token, key);
  if (!isRecord(payload) || !servesPurpose(payload, "confirm")) return null;
  const { e, n, t, c } = payload;
  if (
    typeof e !== "string" ||
    typeof n !== "string" ||
    typeof t !== "number" ||
    typeof c !== "string"
  ) {
    return null;
  }
  if (t > now || now - t > ttlSeconds * 1000) return null;
  return { email: e, firstName: n, signedUpAt: t, consentVersion: c };
}

function readAddressToken(
  purpose: "unsubscribe" | "questions",
  token: string,
  key: Buffer,
): string | null {
  const payload = openToken(purpose, token, key);
  if (!isRecord(payload) || !servesPurpose(payload, purpose)) return null;
  return typeof payload.e === "string" ? payload.e : null;
}

export function createUnsubscribeToken(email: string, key: Buffer): string {
  return sealToken("unsubscribe", { p: "unsubscribe", e: email }, key);
}

export function readUnsubscribeToken(token: string, key: Buffer): string | null {
  return readAddressToken("unsubscribe", token, key);
}

export function createQuestionsToken(email: string, key: Buffer): string {
  return sealToken("questions", { p: "questions", e: email }, key);
}

export function readQuestionsToken(token: string, key: Buffer): string | null {
  return readAddressToken("questions", token, key);
}

export function createFormToken(issuedAt: number, key: Buffer): string {
  return sealToken("form", { p: "form", t: issuedAt }, key);
}

export function readFormTokenIssuedAt(token: string, key: Buffer): number | null {
  const payload = openToken("form", token, key);
  if (!isRecord(payload) || !servesPurpose(payload, "form")) return null;
  return typeof payload.t === "number" ? payload.t : null;
}

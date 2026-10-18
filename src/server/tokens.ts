// Seals and opens authenticated, encrypted link tokens.
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type Purpose = "confirm" | "unsubscribe" | "form";

const ivLength = 12;
const tagLength = 16;

export function sealToken(purpose: Purpose, payload: object, key: Buffer): string {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url");
}

export function openToken(purpose: Purpose, token: string, key: Buffer): unknown {
  if (!/^[A-Za-z0-9_-]{40,2048}$/.test(token)) return null;
  const raw = Buffer.from(token, "base64url");
  if (raw.length < ivLength + tagLength + 1) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, ivLength));
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(raw.subarray(raw.length - tagLength));
    const plain = Buffer.concat([
      decipher.update(raw.subarray(ivLength, raw.length - tagLength)),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

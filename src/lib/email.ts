// Classifies email addresses the same way in browser and server.
export type EmailProblem = "missing" | "noAt" | "noDomainEnding";

const maxEmailLength = 254;
const addressShape = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function findEmailProblem(raw: string): EmailProblem | null {
  const email = raw.trim();
  if (email === "") return "missing";
  if (!email.includes("@")) return "noAt";
  if (email.length > maxEmailLength || !addressShape.test(email)) return "noDomainEnding";
  return null;
}

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

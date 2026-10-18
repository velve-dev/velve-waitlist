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

const dotlessDomains = new Map([
  ["gmail.com", "gmail.com"],
  ["googlemail.com", "gmail.com"],
]);

export function mailboxIdentity(email: string): string {
  const at = email.lastIndexOf("@");
  const domain = email.slice(at + 1);
  const untagged = email.slice(0, at).split("+")[0] ?? "";
  const dotless = dotlessDomains.get(domain);
  return dotless === undefined
    ? `${untagged}@${domain}`
    : `${untagged.replaceAll(".", "")}@${dotless}`;
}

// Turns a typed first name into a safe one.
const maxNameLength = 40;
const nameShape = /^\p{L}[\p{L}\p{M} '’-]*$/u;

export function cleanFirstName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const name = raw.normalize("NFC").trim().replace(/\s+/gu, " ");
  if ([...name].length > maxNameLength) return "";
  return nameShape.test(name) ? name : "";
}

export function greetingFor(firstName: string, email: string): string {
  if (firstName !== "") return firstName;
  const localPart = email.split("@")[0] ?? "";
  if (!/^[A-Za-z]{2,20}$/.test(localPart)) return "there";
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

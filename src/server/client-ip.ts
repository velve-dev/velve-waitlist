// Picks the client network that Traefik appended to the request.
import "server-only";

const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;
const ipv6Groups = 8;
const prefixGroups = 4;

function ipv6Prefix(address: string): string {
  const halves = address.split("::");
  if (halves.length > 2) return address;
  const [head = "", tail] = halves;
  const headGroups = head === "" ? [] : head.split(":");
  const tailGroups = tail === undefined || tail === "" ? [] : tail.split(":");
  const missing = ipv6Groups - headGroups.length - tailGroups.length;
  if (tail === undefined ? missing !== 0 : missing < 1) return address;
  const groups = [...headGroups, ...Array<string>(missing).fill("0"), ...tailGroups];
  const prefix = groups.slice(0, prefixGroups).map((group) => Number.parseInt(group, 16));
  if (prefix.some((group) => !Number.isInteger(group))) return address;
  return `${prefix.map((group) => group.toString(16)).join(":")}::/64`;
}

function networkOf(address: string): string {
  const bare = address
    .replace(/^\[|\]$/g, "")
    .replace(/%.*$/, "")
    .toLowerCase();
  const mapped = mappedIpv4.exec(bare);
  if (mapped?.[1] !== undefined) return mapped[1];
  return bare.includes(":") ? ipv6Prefix(bare) : bare;
}

export function clientNetwork(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  const address = last !== undefined && last !== "" ? last : (headers.get("x-real-ip") ?? "");
  return address === "" ? "unknown" : networkOf(address);
}

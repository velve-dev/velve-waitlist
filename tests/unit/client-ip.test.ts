// Checks which address the limiter keys on.
import { describe, expect, it } from "vitest";
import { clientNetwork } from "@/server/client-ip";

const headers = (values: Record<string, string>) => new Headers(values);

describe("client network", () => {
  it("prefers the address the platform sets in X-Real-IP", () => {
    expect(
      clientNetwork(
        headers({ "x-real-ip": "203.0.113.20", "x-forwarded-for": "1.2.3.4, 100.64.0.7" }),
      ),
    ).toBe("203.0.113.20");
  });

  it("ignores a forged X-Forwarded-For when X-Real-IP is present", () => {
    expect(
      clientNetwork(headers({ "x-real-ip": "203.0.113.21", "x-forwarded-for": "198.51.100.9" })),
    ).toBe("203.0.113.21");
  });

  it("falls back to the last X-Forwarded-For entry", () => {
    expect(clientNetwork(headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.10" }))).toBe(
      "198.51.100.10",
    );
  });

  it("treats a blank X-Real-IP as missing", () => {
    expect(clientNetwork(headers({ "x-real-ip": "  ", "x-forwarded-for": "198.51.100.11" }))).toBe(
      "198.51.100.11",
    );
  });

  it("counts IPv6 per /64 and unwraps mapped IPv4", () => {
    expect(clientNetwork(headers({ "x-real-ip": "2001:db8:1:2:3:4:5:6" }))).toBe(
      "2001:db8:1:2::/64",
    );
    expect(clientNetwork(headers({ "x-real-ip": "::ffff:203.0.113.22" }))).toBe("203.0.113.22");
  });

  it("reports unknown without any address", () => {
    expect(clientNetwork(headers({}))).toBe("unknown");
  });
});

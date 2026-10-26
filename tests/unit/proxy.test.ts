import { tryToParsePath } from "next/dist/lib/try-to-parse-path";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config } from "@/proxy";
import { testEnv } from "../support/services";

async function loadProxy(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...testEnv, ...env })) vi.stubEnv(key, value);
  return (await import("@/proxy")).proxy;
}

function requestFrom(network: string, path = "/stats/api/send", method = "POST") {
  return new NextRequest(`https://velve.test${path}`, {
    method,
    headers: { "x-real-ip": network, "content-type": "application/json" },
    ...(method === "POST" ? { body: "{}" } : {}),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("analytics relay limit", () => {
  it("answers 429 once one network sends more than 60 events a minute", async () => {
    const proxy = await loadProxy();
    for (let event = 0; event < 60; event += 1) {
      expect(proxy(requestFrom("198.51.100.60")).status).toBe(200);
    }
    const limited = proxy(requestFrom("198.51.100.60"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    expect(limited.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(limited.headers.get("x-content-type-options")).toBe("nosniff");
    expect(proxy(requestFrom("198.51.100.61")).status).toBe(200);
  });

  it("reads the limit and its window from the environment", async () => {
    const proxy = await loadProxy({
      ANALYTICS_LIMIT_PER_IP: "2",
      ANALYTICS_LIMIT_WINDOW_SECONDS: "30",
    });
    expect(proxy(requestFrom("198.51.100.62")).status).toBe(200);
    expect(proxy(requestFrom("198.51.100.62")).status).toBe(200);
    const limited = proxy(requestFrom("198.51.100.62"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("30");
  });

  it("counts the relay apart from pages, the script and the other limited routes", async () => {
    const proxy = await loadProxy({ ANALYTICS_LIMIT_PER_IP: "1", LINK_LIMIT_PER_IP: "1" });
    expect(proxy(requestFrom("198.51.100.63")).status).toBe(200);
    expect(proxy(requestFrom("198.51.100.63")).status).toBe(429);
    for (const path of ["/", "/stats/script.js", "/api/subscribe", "/confirm/broken"]) {
      const method = path === "/api/subscribe" ? "POST" : "GET";
      expect(proxy(requestFrom("198.51.100.63", path, method)).status, path).toBe(200);
    }
  });
});

describe("proxy matcher", () => {
  const parsed = config.matcher.map(({ source }) => tryToParsePath(source));
  const patterns = parsed.map(({ regexStr }) => new RegExp(regexStr ?? "^$"));
  const runsProxy = (path: string) => patterns.some((pattern) => pattern.test(path));

  it("compiles with the path-to-regexp of the installed Next.js", () => {
    for (const { route, error, regexStr } of parsed) {
      expect(error, route).toBeUndefined();
      expect(regexStr, route).toMatch(/^\^/);
    }
  });

  it("skips exactly the static assets that next.config.ts secures", () => {
    for (const path of [
      "/_next/static/chunks/main.js",
      "/_next/static/missing.js",
      "/_next/image",
      "/email/logo-mark.png",
      "/icon.svg",
      "/apple-icon.png",
      "/opengraph-image.png",
    ]) {
      expect(runsProxy(path), path).toBe(false);
    }
  });

  it("runs on every other path, including look-alikes of the assets", () => {
    for (const path of [
      "/",
      "/imprint",
      "/api/subscribe",
      "/stats/api/send",
      "/icon.svgx",
      "/icon.svg.html",
      "/iconXsvg",
      "/apple-icon.pngfoo",
      "/apple-iconXpng",
      "/opengraph-image.png/x",
      "/_next/staticfoo",
      "/_next/imagex",
      "/emailx",
      "/email.html",
    ]) {
      expect(runsProxy(path), path).toBe(true);
    }
  });
});

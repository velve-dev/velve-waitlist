import { expect, test } from "@playwright/test";
import { resourcePolicy } from "../../src/server/security-headers";

const lookAlikes = [
  "/icon.svgx",
  "/icon.svg.html",
  "/apple-icon.pngfoo",
  "/opengraph-image.png/x",
  "/_next/staticfoo",
  "/_next/imagex",
  "/emailx",
];

test("paths that only look like assets get the page headers", async ({ request }) => {
  for (const path of lookAlikes) {
    const response = await request.get(path, { headers: { "x-forwarded-for": "10.212.0.1" } });
    const headers = response.headers();
    expect(response.status(), path).toBe(404);
    expect(headers["content-security-policy"], path).toMatch(
      /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
    );
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["strict-transport-security"], path).toBe("max-age=63072000");
    expect(headers["referrer-policy"], path).toBe("no-referrer");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["x-robots-tag"], path).toBe("noindex, nofollow");
  }
});

test("the real assets keep the headers from next.config.ts", async ({ page, request }) => {
  await page.goto("/");
  const script = await page.locator("script[src^='/_next/static/']").first().getAttribute("src");
  const assets: [string, string][] = [
    [script!, "same-origin"],
    ["/_next/static/missing.js", "same-origin"],
    ["/_next/image?url=%2Ficon.svg&w=64&q=75", "same-origin"],
    ["/icon.svg", "same-origin"],
    ["/apple-icon.png", "same-origin"],
    ["/opengraph-image.png", "same-origin"],
    ["/email/logo-mark.png", "cross-origin"],
  ];
  for (const [path, resourcePolicyHeader] of assets) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"], path).toBe(resourcePolicy);
    expect(headers["cross-origin-resource-policy"], path).toBe(resourcePolicyHeader);
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["strict-transport-security"], path).toBe("max-age=63072000");
    expect(headers["referrer-policy"], path).toBe("no-referrer");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
  }
});

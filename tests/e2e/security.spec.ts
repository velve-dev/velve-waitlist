import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { imprint, privacy } from "../../src/content/legal";
import { mockApiKey } from "../support/brevo-mock";
import { brevoMockUrl, e2eHealthToken, e2eWebhookSecret } from "../support/e2e-env";
import {
  expectNoSeriousA11yViolations,
  linkFrom,
  saveScreen,
  signUp,
  uniqueEmail,
  useFreshNetwork,
  viewports,
  waitForMail,
} from "./helpers";

const pages = [
  "/",
  "/imprint",
  "/privacy",
  "/unsubscribed",
  "/unsubscribe/broken",
  "/confirm/broken",
  "/questions/broken",
  "/missing",
];

function watchPrivacy(page: Page, origin: string) {
  const foreignRequests: string[] = [];
  const cookieHeaders: string[] = [];
  const policyViolations: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["data:", "blob:"].includes(url.protocol) && url.origin !== origin)
      foreignRequests.push(url.href);
  });
  page.on("response", async (response) => {
    const setCookie = await response.headerValue("set-cookie");
    if (setCookie !== null) cookieHeaders.push(response.url());
  });
  page.on("console", (message) => {
    if (/Content.Security.Policy/i.test(message.text())) policyViolations.push(message.text());
  });
  return { foreignRequests, cookieHeaders, policyViolations };
}

async function storageUse(page: Page) {
  return page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    indexed: (await indexedDB.databases()).length,
  }));
}

test.beforeEach(async ({ page }) => {
  await useFreshNetwork(page);
});

test("pages make no foreign requests, set no cookies and store nothing", async ({
  page,
  context,
  baseURL,
}) => {
  const watched = watchPrivacy(page, new URL(baseURL!).origin);
  for (const path of pages) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  const email = uniqueEmail("privacy");
  await signUp(page, email);
  const confirmLink = linkFrom(
    await waitForMail(email, "Confirm your spot on the Velve waitlist"),
    "/confirm",
  );
  await page.goto(confirmLink);
  await page.waitForLoadState("networkidle");
  await page.goto(confirmLink);
  await expect(page.getByRole("heading", { name: "You're already in" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.goto(linkFrom(await waitForMail(email, "You're on the Velve waitlist"), "/questions"));
  await page.waitForLoadState("networkidle");
  expect(watched.foreignRequests).toEqual([]);
  expect(watched.cookieHeaders).toEqual([]);
  expect(watched.policyViolations).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(await storageUse(page)).toEqual({ local: 0, session: 0, indexed: 0 });
});

test("every page sends the security headers", async ({ request }) => {
  for (const path of pages) {
    const response = await request.get(path, { headers: { "x-forwarded-for": "10.210.0.1" } });
    const headers = response.headers();
    const policy = headers["content-security-policy"] ?? "";
    expect(policy, path).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(policy, path).toContain("frame-ancestors 'none'");
    expect(policy, path).toContain("object-src 'none'");
    expect(policy, path).not.toContain("unsafe-inline");
    expect(policy, path).not.toContain("unsafe-eval");
    expect(headers["referrer-policy"], path).toBe("no-referrer");
    expect(headers["permissions-policy"], path).toContain("camera=()");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-robots-tag"], path).toBe("noindex, nofollow");
    expect(headers["set-cookie"], path).toBeUndefined();
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
});

test("the client bundle carries no server configuration", () => {
  const bundle = path.resolve(import.meta.dirname, "../../.next/static");
  const files = readdirSync(bundle, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
  expect(files.length).toBeGreaterThan(0);
  const serverOnly = [
    "BREVO_",
    "TOKEN_KEY",
    "RATE_LIMIT_SALT_SECRET",
    "HEALTH_TOKEN",
    mockApiKey,
    e2eWebhookSecret,
    e2eHealthToken,
  ];
  const leaks = files.flatMap((file) => {
    const content = readFileSync(file, "latin1");
    return serverOnly
      .filter((value) => content.includes(value))
      .map((value) => `${path.relative(bundle, file)}: ${value}`);
  });
  expect(leaks).toEqual([]);
});

test("each response gets a fresh nonce", async ({ request }) => {
  const first = (await request.get("/")).headers()["content-security-policy"];
  const second = (await request.get("/")).headers()["content-security-policy"];
  expect(first).not.toBe(second);
});

test("API and static responses are locked down too", async ({ request }) => {
  for (const path of ["/api/health", "/icon.svg", "/email/logo-mark.png"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"], path).toContain("default-src 'none'");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe("no-referrer");
  }
});

test("every other response type carries the headers too", async ({ page, request }) => {
  await page.goto("/");
  const script = await page.locator("script[src^='/_next/static/']").first().getAttribute("src");
  const paths = [
    "/robots.txt",
    "/apple-icon.png",
    "/opengraph-image.png",
    script!,
    "/_next/static/missing.js",
    "/stats/script.js",
  ];
  for (const path of paths) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["referrer-policy"], path).toBe("no-referrer");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["permissions-policy"], path).toContain("camera=()");
    expect(headers["set-cookie"], path).toBeUndefined();
  }
  const rsc = await request.get("/imprint", { headers: { rsc: "1", "next-router-prefetch": "1" } });
  expect(rsc.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(rsc.headers()["set-cookie"]).toBeUndefined();
});

test("the rate limit answer is locked down", async ({ request }) => {
  let response = await request.get("/confirm/broken", {
    headers: { "x-forwarded-for": "10.211.0.1" },
  });
  for (let attempt = 0; attempt < 200 && response.status() !== 429; attempt += 1) {
    response = await request.get("/confirm/broken", {
      headers: { "x-forwarded-for": "10.211.0.1" },
    });
  }
  expect(response.status()).toBe(429);
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'none'");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

test("mail images load in webmail on other origins", async ({ request }) => {
  const headers = (await request.get("/email/logo-mark.png")).headers();
  expect(headers["cross-origin-resource-policy"]).toBe("cross-origin");
});

test("search engines are kept out while the site is not indexable", async ({ page, request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("the simple health route answers without touching dependencies", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(["service", "status", "timestamp"]);
  expect(body.status).toBe("ok");
});

test("the detailed health route needs the token and hides internals", async ({ request }) => {
  expect((await request.get("/api/health/detailed")).status()).toBe(401);
  const response = await request.get("/api/health/detailed", {
    headers: { authorization: `Bearer ${e2eHealthToken}` },
  });
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(JSON.parse(text)).toMatchObject({
    status: "ok",
    checks: { configuration: "ok", mail: "ok" },
  });
  expect(text).not.toMatch(/127\.0\.0\.1|brevo|key/i);

  const wrong = e2eHealthToken.replace(/.$/, (last) => (last === "0" ? "1" : "0"));
  const refused = await request.get("/api/health/detailed", {
    headers: { authorization: `Bearer ${wrong}` },
  });
  expect(refused.status()).toBe(401);

  await fetch(`${brevoMockUrl}/__mock/fail?count=1&matching=/contacts/lists/`);
  const degraded = await request.get("/api/health/detailed", {
    headers: { authorization: `Bearer ${e2eHealthToken}` },
  });
  expect(degraded.status()).toBe(200);
  const degradedText = await degraded.text();
  expect(JSON.parse(degradedText)).toMatchObject({
    status: "degraded",
    checks: { mail: "error" },
  });
  expect(degradedText).not.toMatch(/127\.0\.0\.1|brevo|key|stack|503/i);
});

test("analytics runs through our origin and never sees link tokens", async ({ page }) => {
  const email = uniqueEmail("analytics");
  await signUp(page, email);
  const link = linkFrom(
    await waitForMail(email, "Confirm your spot on the Velve waitlist"),
    "/confirm",
  );
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "You're in" })).toBeVisible();
  const token = link.split("/").at(-1)!;
  await expect
    .poll(async () => {
      const state = (await (await fetch(`${brevoMockUrl}/__mock/state`)).json()) as {
        umamiEvents: unknown[];
      };
      return JSON.stringify(state.umamiEvents);
    })
    .toContain("signup_confirmed");
  const events = JSON.stringify(
    ((await (await fetch(`${brevoMockUrl}/__mock/state`)).json()) as { umamiEvents: unknown[] })
      .umamiEvents,
  );
  expect(events).toContain("signup_submitted");
  expect(events).toContain('"url":"/confirm"');
  expect(events).not.toContain(token);
  expect(events).not.toContain(email);
});

for (const viewport of viewports) {
  test(`legal pages at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/imprint");
    await expect(page.getByRole("heading", { level: 1, name: imprint.title })).toBeVisible();
    await expect(page.getByRole("link", { name: "+49 176 61028522" })).toHaveAttribute(
      "href",
      "tel:+4917661028522",
    );
    await expectNoSeriousA11yViolations(page);
    await saveScreen(page, `imprint-${viewport.width}`);
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: privacy.title })).toBeVisible();
    for (const section of privacy.sections) {
      await expect(page.getByRole("heading", { level: 2, name: section.heading })).toBeVisible();
    }
    await expectNoSeriousA11yViolations(page);
    await saveScreen(page, `privacy-${viewport.width}`);
  });
}

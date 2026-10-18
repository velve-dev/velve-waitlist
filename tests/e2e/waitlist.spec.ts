import { expect, test } from "@playwright/test";
import { form, formErrors, submitted } from "../../src/content/copy";
import {
  expectNoSeriousA11yViolations,
  mailsTo,
  saveScreen,
  signUp,
  uniqueEmail,
  useFreshNetwork,
  viewports,
  waitForMail,
} from "./helpers";

const accent = "rgb(123, 92, 255)";
const failedRed = "rgb(240, 85, 76)";
const warningAmber = "rgb(245, 166, 35)";

for (const viewport of viewports) {
  test.describe(`waitlist at ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await useFreshNetwork(page);
    });

    test("empty state keeps the button disabled", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Security without shortcuts.",
      );
      await expect(page.getByRole("button", { name: form.submit })).toBeDisabled();
      const placeholder =
        viewport.width >= 720 ? form.namePlaceholderDesktop : form.namePlaceholderMobile;
      await expect(page.getByLabel(form.nameLabel)).toHaveAttribute("placeholder", placeholder);
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `empty-${viewport.width}`);
    });

    test("focus shows the accent border and ring", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel(form.emailLabel, { exact: true }).focus();
      const target =
        viewport.width >= 720
          ? page.locator("form > div").first()
          : page.getByLabel(form.emailLabel, { exact: true });
      await expect(target).toHaveCSS("border-top-color", accent);
      await expect(target).toHaveCSS("box-shadow", /rgba\(123, 92, 255, 0\.55\) 0px 0px 0px 2px/);
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `focus-${viewport.width}`);
    });

    test("invalid input keeps values, explains and refocuses", async ({ page }) => {
      await page.goto("/");
      const email = page.getByLabel(form.emailLabel, { exact: true });
      await page.getByLabel(form.nameLabel).fill("Alex");
      await email.fill("alex.company.com");
      await email.press("Enter");
      await expect(page.locator("#f-email-error")).toHaveText(formErrors.noAt);
      await email.fill("alex@company");
      await page.getByRole("button", { name: form.submit }).click();
      await expect(page.locator("#f-email-error")).toHaveText(formErrors.noDomainEnding);
      await expect(page.locator("#f-email-error")).toHaveCSS("color", failedRed);
      await expect(email).toBeFocused();
      await expect(email).toHaveAttribute("aria-invalid", "true");
      await expect(email).toHaveAttribute("aria-describedby", "f-email-error");
      await expect(email).toHaveValue("alex@company");
      await expect(page.getByLabel(form.nameLabel)).toHaveValue("Alex");
      const bordered = viewport.width >= 720 ? page.locator("form > div").first() : email;
      await expect(bordered).toHaveCSS("border-top-color", failedRed);
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `error-${viewport.width}`);
    });

    test("rate limit shows the warning and locks the button until Retry-After", async ({
      page,
    }) => {
      await page.route("/api/subscribe", (route) =>
        route.fulfill({
          status: 429,
          headers: { "retry-after": "2", "content-type": "application/json" },
          body: JSON.stringify({ error: "rate_limited" }),
        }),
      );
      await page.goto("/");
      const email = page.getByLabel(form.emailLabel, { exact: true });
      await page.getByLabel(form.nameLabel).fill("Alex");
      await email.fill("alex@company.com");
      await page.getByRole("button", { name: form.submit }).click();
      const alert = page.locator("#f-email-error");
      await expect(alert).toHaveText(formErrors.rateLimited);
      await expect(alert).toHaveCSS("color", warningAmber);
      await expect(email).toHaveAttribute("aria-invalid", "false");
      await expect(page.getByRole("button", { name: form.submit })).toBeDisabled();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `ratelimited-${viewport.width}`);
      await expect(page.getByRole("button", { name: form.submit })).toBeEnabled({ timeout: 4000 });
    });

    test("network failure keeps the input and says so", async ({ page }) => {
      await page.route("/api/subscribe", (route) => route.abort());
      await page.goto("/");
      await page.getByLabel(form.emailLabel, { exact: true }).fill("alex@company.com");
      await page.getByRole("button", { name: form.submit }).click();
      await expect(page.locator("#f-email-error")).toHaveText(formErrors.failed);
      await expect(page.getByLabel(form.emailLabel, { exact: true })).toHaveValue(
        "alex@company.com",
      );
    });

    test("submitting sends a confirmation and Typo resets the form", async ({ page }) => {
      const address = uniqueEmail("submit");
      await signUp(page, address, "Alex");
      await expect(page.getByText(address)).toBeVisible();
      await expect(page.getByRole("heading", { name: submitted.title })).toBeFocused();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `submitted-${viewport.width}`);
      const mail = await waitForMail(address, "Confirm your spot on the Velve waitlist");
      expect(mail.text).toContain("Hey Alex,");
      expect(mail.pixelConsent).toBe(false);
      await page.getByRole("button", { name: submitted.typo }).click();
      await expect(page.getByLabel(form.emailLabel, { exact: true })).toBeFocused();
      await expect(page.getByLabel(form.emailLabel, { exact: true })).toHaveValue("");
    });

    test("nothing overflows sideways", async ({ page }) => {
      await page.goto("/");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test("the pill types the command and goes live", async ({ page }) => {
  await page.goto("/");
  const typed = page.locator(".velve-typed");
  await expect(typed).toHaveText("git push origin main");
  await expect(page.locator(".velve-live")).toHaveCSS("opacity", "1", { timeout: 4000 });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the pill is finished at once and nothing pulses", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".velve-live")).toHaveCSS("opacity", "1");
    await expect(page.locator(".velve-typed")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".velve-pulse").first()).toHaveCSS("animation-name", "none");
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("heading and subline take at most three lines together", async ({ page }) => {
    await page.goto("/");
    const lines = await page.evaluate(() =>
      ["h1", "main p"].reduce((total, selector) => {
        const element = document.querySelector(selector);
        if (element === null) return total + 99;
        const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
        return total + Math.round(element.getBoundingClientRect().height / lineHeight);
      }, 0),
    );
    expect(lines).toBeLessThanOrEqual(3);
  });
});

test("signing up stays on our origin and leaves no cookies or storage", async ({
  page,
  context,
  baseURL,
}) => {
  await useFreshNetwork(page);
  const origins = new Set<string>();
  page.on("request", (request) => {
    origins.add(new URL(request.url()).origin);
  });
  await signUp(page, uniqueEmail("privacy"), "Alex");
  await page.waitForTimeout(300);
  expect([...origins]).toEqual([new URL(baseURL ?? "").origin]);
  expect(await context.cookies()).toEqual([]);
  const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
  expect(stored).toBe(0);
});

test("bots filling the honeypot get the same answer and no mail", async ({ page }) => {
  await useFreshNetwork(page);
  const address = uniqueEmail("honeypot");
  await page.goto("/");
  await page.waitForTimeout(1600);
  await page.locator('input[name="website"]').fill("https://spam.example", { force: true });
  await page.getByLabel(form.emailLabel, { exact: true }).fill(address);
  await page.getByRole("button", { name: form.submit }).click();
  await expect(page.getByRole("heading", { name: submitted.title })).toBeVisible();
  await page.waitForTimeout(500);
  expect(await mailsTo(address)).toEqual([]);
});

import { expect, test } from "@playwright/test";
import {
  alreadyIn,
  brokenConfirmLink,
  brokenUnsubscribeLink,
  confirmed,
  notFound,
  serverError,
  unsubscribe,
  unsubscribed,
} from "../../src/content/copy";
import { brevoMockUrl, e2eWebhookSecret } from "../support/e2e-env";
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

async function contactExists(email: string): Promise<boolean> {
  const state = (await (await fetch(`${brevoMockUrl}/__mock/state`)).json()) as {
    contacts: Record<string, unknown>;
  };
  return email in state.contacts;
}

test.beforeEach(async ({ page }) => {
  await useFreshNetwork(page);
});

test("sign up, confirm twice, then unsubscribe and get deleted", async ({ page }) => {
  const email = uniqueEmail("flow");
  await signUp(page, email, "Alex");
  const confirmation = await waitForMail(email, "Confirm your spot on the Velve waitlist");
  expect(await contactExists(email)).toBe(false);

  await page.goto(linkFrom(confirmation, "/confirm"));
  await expect(page.getByRole("heading", { name: "You're in, Alex" })).toBeVisible();
  await expect(page.getByText(confirmed.body)).toBeVisible();
  expect(await contactExists(email)).toBe(true);

  await page.goto(linkFrom(confirmation, "/confirm"));
  await expect(page.getByRole("heading", { name: alreadyIn.title })).toBeVisible();

  const welcome = await waitForMail(email, "You're on the Velve waitlist");
  expect(welcome.text).toContain("Hey Alex,");
  await page.goto(linkFrom(welcome, "/unsubscribe"));
  await expect(page.getByRole("heading", { name: unsubscribe.title })).toBeVisible();
  await page.getByRole("button", { name: unsubscribe.confirm }).click();
  await expect(page.getByRole("heading", { name: unsubscribed.title })).toBeFocused();
  expect(await contactExists(email)).toBe(false);
});

test("link pages send no referrer to other sites", async ({ page }) => {
  for (const path of ["/confirm/broken-token", "/unsubscribe/broken-token"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  }
});

test("one-click unsubscribe deletes without a question", async ({ page, request }) => {
  const email = uniqueEmail("oneclick");
  await signUp(page, email);
  await page.goto(
    linkFrom(await waitForMail(email, "Confirm your spot on the Velve waitlist"), "/confirm"),
  );
  const welcome = await waitForMail(email, "You're on the Velve waitlist");
  const response = await request.post(`/api${linkFrom(welcome, "/unsubscribe")}`, {
    form: { "List-Unsubscribe": "One-Click" },
  });
  expect(response.status()).toBe(200);
  expect(await contactExists(email)).toBe(false);
});

test("Brevo unsubscribe webhooks delete the contact", async ({ page, request }) => {
  const email = uniqueEmail("webhook");
  await signUp(page, email);
  await page.goto(
    linkFrom(await waitForMail(email, "Confirm your spot on the Velve waitlist"), "/confirm"),
  );
  expect(await contactExists(email)).toBe(true);
  const rejected = await request.post("/api/webhooks/brevo", {
    data: { event: "unsubscribe", email },
    headers: { authorization: "Bearer wrong" },
  });
  expect(rejected.status()).toBe(401);
  const response = await request.post("/api/webhooks/brevo", {
    data: { event: "unsubscribe", email },
    headers: { authorization: `Bearer ${e2eWebhookSecret}` },
  });
  expect(response.status()).toBe(200);
  expect(await contactExists(email)).toBe(false);
});

test("a failing upstream shows the generic error page", async ({ page }) => {
  const email = uniqueEmail("upstream");
  await signUp(page, email);
  const link = linkFrom(
    await waitForMail(email, "Confirm your spot on the Velve waitlist"),
    "/confirm",
  );
  await fetch(`${brevoMockUrl}/__mock/fail?count=1`);
  await page.goto(link);
  await expect(page.getByRole("heading", { name: serverError.title })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/brevo|stack|Error:/i);
});

test("link routes are rate limited per network", async ({ request }) => {
  const headers = { "x-forwarded-for": "10.200.0.1" };
  let last = 0;
  for (let attempt = 0; attempt < 31; attempt += 1) {
    last = (await request.get("/unsubscribe/not-a-token", { headers })).status();
  }
  expect(last).toBe(429);
});

for (const viewport of viewports) {
  test.describe(`message pages at ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("confirmed and already listed", async ({ page }) => {
      const email = uniqueEmail(`pages${viewport.width}`);
      await signUp(page, email);
      const link = linkFrom(
        await waitForMail(email, "Confirm your spot on the Velve waitlist"),
        "/confirm",
      );
      await page.goto(link);
      await expect(page.getByRole("heading", { name: confirmed.title, exact: true })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "Threads" })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `confirmed-${viewport.width}`);
      await page.goto(link);
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `already-${viewport.width}`);
    });

    test("broken links, unsubscribe pages and 404", async ({ page }) => {
      await page.goto("/confirm/broken-token");
      await expect(page.getByRole("heading", { name: brokenConfirmLink.title })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `confirm-invalid-${viewport.width}`);

      await page.goto("/unsubscribe/broken-token");
      await expect(page.getByText(brokenUnsubscribeLink.body.split("hello@")[0]!)).toBeVisible();
      await expect(page.getByRole("link", { name: "hello@velve.dev" }).first()).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `unsubscribe-invalid-${viewport.width}`);

      await page.goto("/unsubscribed");
      await expect(page.getByRole("heading", { name: unsubscribed.title })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `unsubscribed-${viewport.width}`);

      const response = await page.goto("/nothing-here");
      expect(response?.status()).toBe(404);
      await expect(page.getByText(notFound.eyebrow)).toBeVisible();
      await expect(page.getByRole("heading", { name: notFound.title })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `not-found-${viewport.width}`);
    });

    test("unsubscribe question", async ({ page }) => {
      const email = uniqueEmail(`ask${viewport.width}`);
      await signUp(page, email);
      await page.goto(
        linkFrom(await waitForMail(email, "Confirm your spot on the Velve waitlist"), "/confirm"),
      );
      await page.goto(
        linkFrom(await waitForMail(email, "You're on the Velve waitlist"), "/unsubscribe"),
      );
      const confirmButton = page.getByRole("button", { name: unsubscribe.confirm });
      const stay = page.getByRole("link", { name: unsubscribe.stay });
      await expect(confirmButton).toBeVisible();
      const [buttonBox, stayBox] = [await confirmButton.boundingBox(), await stay.boundingBox()];
      if (viewport.width < 720) expect(stayBox!.y).toBeGreaterThan(buttonBox!.y);
      else expect(stayBox!.y).toBe(buttonBox!.y);
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `unsubscribe-${viewport.width}`);
    });
  });
}

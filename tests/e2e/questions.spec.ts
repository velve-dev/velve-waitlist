import { expect, test, type Page } from "@playwright/test";
import { brokenQuestionsLink, formErrors, questions, share } from "../../src/content/copy";
import { brevoMockUrl } from "../support/e2e-env";
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

async function contactAttributes(email: string): Promise<Record<string, unknown> | undefined> {
  const state = (await (await fetch(`${brevoMockUrl}/__mock/state`)).json()) as {
    contacts: Record<string, { attributes: Record<string, unknown> }>;
  };
  return state.contacts[email]?.attributes;
}

async function confirmedPage(page: Page, label: string): Promise<{ email: string; link: string }> {
  const email = uniqueEmail(label);
  await signUp(page, email);
  const link = linkFrom(
    await waitForMail(email, "Confirm your spot on the Velve waitlist"),
    "/confirm",
  );
  await page.goto(link);
  return { email, link };
}

async function vote(page: Page, firstDeploy: string, runsOn: string) {
  const submit = page.getByRole("button", { name: questions.submit });
  await expect(submit).toBeDisabled();
  await page.locator("label").filter({ hasText: firstDeploy }).click();
  await expect(page.getByRole("radio", { name: firstDeploy })).toBeChecked();
  await expect(submit).toBeDisabled();
  await page.locator("label").filter({ hasText: runsOn }).click();
  await expect(page.getByRole("radio", { name: runsOn })).toBeChecked();
  await expect(submit).toBeEnabled();
  await submit.click();
}

test.beforeEach(async ({ page }) => {
  await useFreshNetwork(page);
});

for (const viewport of viewports) {
  test.describe(`questions at ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("vote right on the confirmation page", async ({ page }) => {
      const { email } = await confirmedPage(page, `vote${viewport.width}`);
      await expect(page.getByText(questions.eyebrow)).toBeVisible();
      await expect(page.getByRole("heading", { name: questions.title })).toBeVisible();
      await expect(page.getByRole("link", { name: "Share on Threads" })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `questions-open-${viewport.width}`);

      await vote(page, questions.firstDeploy.options.api, questions.runsOn.options.own_server);
      const done = page.getByRole("heading", { name: questions.doneTitle });
      await expect(done).toBeFocused();
      await expect(page.getByText(questions.doneBody)).toBeVisible();
      await page
        .locator(".velve-fade-in")
        .evaluate((element) =>
          Promise.all(element.getAnimations().map((animation) => animation.finished)),
        );
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `questions-counted-${viewport.width}`);
      expect(await contactAttributes(email)).toMatchObject({
        FIRST_DEPLOY: "api",
        RUNS_ON: "own_server",
      });
    });

    test("already listed shows the questions too", async ({ page }) => {
      const { link } = await confirmedPage(page, `again${viewport.width}`);
      await page.goto(link);
      await expect(page.getByRole("heading", { name: "You're already in" })).toBeVisible();
      await expect(page.getByRole("heading", { name: questions.title })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `questions-already-${viewport.width}`);
    });

    test("the welcome mail leads to the questions page", async ({ page }) => {
      const { email } = await confirmedPage(page, `mail${viewport.width}`);
      const welcome = await waitForMail(email, "You're on the Velve waitlist");
      await page.goto(linkFrom(welcome, "/questions"));
      await expect(page.getByRole("heading", { level: 1, name: questions.title })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `questions-page-${viewport.width}`);
      await vote(page, questions.firstDeploy.options.database, questions.runsOn.options.nowhere);
      await expect(
        page.getByRole("heading", { level: 1, name: questions.doneTitle }),
      ).toBeFocused();
      await expect(page.getByRole("link", { name: questions.back })).toBeVisible();
      await saveScreen(page, `questions-page-counted-${viewport.width}`);
      expect(await contactAttributes(email)).toMatchObject({
        FIRST_DEPLOY: "database",
        RUNS_ON: "nowhere",
      });
    });

    test("broken link, rate limit and server error", async ({ page }) => {
      await page.goto("/questions/broken-token");
      await expect(page.getByText(brokenQuestionsLink.body)).toBeVisible();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `questions-invalid-${viewport.width}`);

      await confirmedPage(page, `errors${viewport.width}`);
      await page.route("/api/questions", (route) =>
        route.fulfill({ status: 429, headers: { "retry-after": "2" }, body: "{}" }),
      );
      await vote(page, questions.firstDeploy.options.web_app, questions.runsOn.options.paas);
      await expect(
        page.getByRole("alert").filter({ hasText: formErrors.rateLimited }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: questions.submit })).toBeDisabled();
      await expectNoSeriousA11yViolations(page);
      await saveScreen(page, `questions-ratelimited-${viewport.width}`);
      await expect(page.getByRole("button", { name: questions.submit })).toBeEnabled({
        timeout: 4000,
      });

      await page.unroute("/api/questions");
      await page.route("/api/questions", (route) => route.fulfill({ status: 500, body: "{}" }));
      await page.getByRole("button", { name: questions.submit }).click();
      await expect(page.getByRole("alert").filter({ hasText: formErrors.failed })).toBeVisible();
      await saveScreen(page, `questions-failed-${viewport.width}`);
    });
  });
}

test("answer pills work with the keyboard", async ({ page }) => {
  await confirmedPage(page, "keyboard");
  const first = page.getByRole("radio", { name: questions.firstDeploy.options.web_app });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: questions.firstDeploy.options.api })).toBeChecked();
  const pill = page
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: questions.firstDeploy.options.api }) });
  await expect(pill).toHaveCSS("box-shadow", /rgba\(123, 92, 255, 0\.55\) 0px 0px 0px 2px/);
});

test("the share button opens a prefilled post in a new tab without loading anything", async ({
  page,
}) => {
  await confirmedPage(page, "share");
  const shareLink = page.getByRole("link", { name: "Share on Threads" });
  const href = await shareLink.getAttribute("href");
  expect(href).toBe(`https://www.threads.com/intent/post?text=${encodeURIComponent(share.text)}`);
  await expect(shareLink).toHaveAttribute("target", "_blank");
  await expect(shareLink).toHaveAttribute("rel", "noopener noreferrer");
});

test("answers that Brevo cannot store show the normal error", async ({ page }) => {
  const email = uniqueEmail("noattr");
  await fetch(
    `${brevoMockUrl}/__mock/attributes?matching=${encodeURIComponent(email)}&missing=FIRST_DEPLOY,RUNS_ON`,
  );
  await signUp(page, email);
  await page.goto(
    linkFrom(await waitForMail(email, "Confirm your spot on the Velve waitlist"), "/confirm"),
  );
  await vote(page, questions.firstDeploy.options.api, questions.runsOn.options.paas);
  await expect(page.getByRole("alert").filter({ hasText: formErrors.failed })).toBeVisible();
});

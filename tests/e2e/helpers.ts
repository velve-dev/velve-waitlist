import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { brevoMockUrl } from "../support/e2e-env";
import type { MockMail } from "../support/brevo-mock";

export const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

let ipCounter = 0;

export async function useFreshNetwork(page: Page) {
  ipCounter += 1;
  const worker = process.env.TEST_WORKER_INDEX ?? "0";
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${Number(worker) + 1}.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`,
  });
}

export function uniqueEmail(label: string): string {
  return `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@company.com`;
}

export async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

export async function saveScreen(page: Page, name: string) {
  if (process.env.SCREENS !== "1") return;
  await page.screenshot({
    path: `docs/design/screens/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

export async function mailsTo(email: string): Promise<MockMail[]> {
  const response = await fetch(`${brevoMockUrl}/__mock/state`);
  const state = (await response.json()) as { mails: MockMail[] };
  return state.mails.filter((mail) => mail.to === email);
}

export async function waitForMail(email: string, subject: string): Promise<MockMail> {
  let found: MockMail | undefined;
  await expect
    .poll(async () => {
      found = (await mailsTo(email)).find((mail) => mail.subject === subject);
      return found !== undefined;
    })
    .toBe(true);
  return found!;
}

export function linkFrom(mail: MockMail, path: string): string {
  const match = new RegExp(`https?://[^\\s"]+${path}/[A-Za-z0-9_-]+`).exec(mail.text);
  if (match === null) throw new Error(`no ${path} link in mail`);
  return new URL(match[0]).pathname;
}

export async function signUp(page: Page, email: string, name = "") {
  await page.goto("/");
  await page.waitForTimeout(1600);
  if (name !== "") await page.getByLabel("First name, optional").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
}

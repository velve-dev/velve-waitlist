import { expect, test } from "@playwright/test";

test("the waitlist page renders its heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Security without shortcuts.");
});

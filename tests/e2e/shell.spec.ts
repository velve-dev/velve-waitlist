// Header and footer match the design at every breakpoint.
import { expect, test } from "@playwright/test";

const accentRing = "rgba(123, 92, 255, 0.55)";

for (const width of [375, 768, 1280]) {
  test(`the shell keeps its layout at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const header = page.getByRole("banner");
    expect((await header.boundingBox())?.height).toBe(56);
    const mark = await header
      .getByRole("link", { name: "Velve home" })
      .locator("svg")
      .boundingBox();
    expect(mark?.width).toBe(24);
    expect(Math.abs((mark?.x ?? 0) + 12 - width / 2)).toBeLessThanOrEqual(1);

    const grid = page.getByRole("contentinfo").locator("> div").first();
    const columns = await grid.evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns.split(" "),
    );
    expect(columns).toHaveLength(width >= 720 ? 3 : 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test("the footer carries the approved copy, links and a hidden wordmark", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");

  await expect(
    footer.getByText("Ships when it's ready, not when the slide deck says so."),
  ).toBeVisible();
  await expect(footer.getByRole("link", { name: "hello@velve.dev" })).toHaveAttribute(
    "href",
    "mailto:hello@velve.dev",
  );
  const follow = footer.getByRole("navigation", { name: "Follow the build" });
  await expect(follow.getByRole("link", { name: "Threads" })).toBeVisible();
  await expect(follow.getByRole("link", { name: "GitHub" })).toBeVisible();
  const legal = footer.getByRole("navigation", { name: "Legal" });
  await expect(legal.getByRole("link", { name: "Imprint" })).toHaveAttribute("href", "/imprint");
  await expect(legal.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await expect(
    footer.getByText("No cookies were harmed in the making of this page. There were none."),
  ).toBeVisible();
  await expect(footer.getByRole("link", { name: "© 2026 Levo Studio" })).toHaveAttribute(
    "href",
    "https://levo-studio.com",
  );

  const wordmark = footer.locator("svg text", { hasText: "velve" });
  await expect(wordmark).toHaveAttribute("textLength", "1000");
  await expect(wordmark).toHaveCSS("fill", "rgb(13, 13, 19)");
  await expect(wordmark).toHaveCSS("stroke", "rgb(38, 36, 47)");
  await expect(wordmark).toHaveCSS("font-weight", "600");
  expect(await wordmark.evaluate((el) => el.closest("[aria-hidden='true']") !== null)).toBe(true);
});

test("the page markup uses no inline style attributes", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toMatch(/\sstyle=/);
});

test("keyboard focus shows the accent ring on footer links", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Imprint" });
  await link.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect
    .poll(() => link.evaluate((el) => getComputedStyle(el).outlineColor))
    .toBe(accentRing);
});

import { test, expect } from "@playwright/test";

test("brand homepage is the single public gateway, responsive and motion-safe", async ({ page }) => {
  await page.route("https://*.supabase.co/**", route => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Progress, with intention/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "品牌導覽" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in|Open app/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /不登入|訪客/ })).toHaveCount(0);
  for (const image of await page.locator(".brand-story-image img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  // fullPage screenshots do not scroll the viewport, so reveal the final
  // editorial block first to capture the same design users see while scrolling.
  await page.locator(".brand-reveal").last().scrollIntoViewIfNeeded();
  await expect(page.locator(".brand-reveal").last()).toHaveClass(/is-visible/);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: "test-results/brand-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("heading", { name: /Progress, with intention/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.locator(".brand-reveal").first().evaluate(el =>
    getComputedStyle(el).transitionDuration)).toBe("0s");
  await page.screenshot({ path: "test-results/brand-mobile.png", fullPage: true });
});

test("authenticated Today uses the same Light visual system", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW !== "1", "isolated review identity required");
  // The review build uses a strictly local synthetic account; no private API.
  await page.goto("/today/");
  await expect(page.getByTestId("today-v3")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({ path: "test-results/today-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "手機主導覽" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/today-mobile.png", fullPage: true });
});

import { expect, test } from "./authenticated";

test("Today black-line page remains legible inside the current PWA chrome", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  await expect(page.locator(".today-v3-focus")).toBeVisible();
  await expect.poll(async () => page.locator('meta[name="theme-color"]').getAttribute("content"))
    .toBe("#000000");
  expect(await page.locator(".app.jfs3-shell").evaluate(el => getComputedStyle(el).backgroundColor))
    .toBe("rgb(0, 0, 0)");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const data = await manifest.json();
  expect(data.theme_color).toBe("#000000");
  expect(data.background_color).toBe("#000000");
  await page.screenshot({ path: "test-results/glass-v3-browser-chrome-mobile.png", fullPage: false });
});

test("Glass V3: modal traps focus even after programmatic focus escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  await page.getByRole("button", { name: "修正今日飲水量" }).click();
  const dialog = page.getByRole("dialog", { name: "修正今日飲水" });
  const close = dialog.getByRole("button", { name: "關閉視窗" });
  await expect(close).toBeFocused();
  const input = dialog.getByRole("spinbutton", { name: "今日總飲水量 ml" });
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  // A third-party widget or script must not be able to strand keyboard focus
  // behind the active modal.
  await page.locator(".topbar button").first().evaluate(el => (el as HTMLElement).focus());
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await expect(page.getByRole("button", { name: "修正今日飲水量" })).toBeFocused();
});

test("Glass V3: parent state and saved water remain intact after sheet interaction", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/today/");
  await page.getByRole("button", { name: "修正今日飲水量" }).click();
  const sheet = page.getByRole("dialog", { name: "修正今日飲水" });
  await sheet.getByRole("spinbutton", { name: "今日總飲水量 ml" }).fill("650");
  await sheet.getByRole("button", { name: "儲存飲水量" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator(".today-v3-water-total strong")).toContainText("650");
  await page.reload();
  await expect(page.locator(".today-v3-water-total strong")).toContainText("650");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
});

test("Glass V3: Showcase-only component styles stay isolated from live app cards", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ui-showcase/");
  const demo = page.getByTestId("glass-system-v2-lab");
  await expect(demo.locator(".jfs-glass-live-card")).toHaveCount(2);
  await expect(demo.locator(".jfs-glass-live-card").first()).toHaveCSS("display", "flex");
  await page.goto("/today/");
  await expect(page.locator(".today-v3-focus.jfs-glass-card")).toBeVisible();
  await expect(page.locator(".today-v3-focus")).not.toHaveClass(/jfs-glass-live-card/);
  await page.screenshot({ path: "test-results/glass-v3-foundation-desktop.png", fullPage: false });
});

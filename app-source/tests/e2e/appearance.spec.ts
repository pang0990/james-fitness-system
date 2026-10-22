import { test, expect, DATA_KEY } from "./authenticated";

/**
 * Appearance regression using the same isolated, synthetic account as
 * production smoke tests. The current default is Minimal/light, not the
 * historic Cinematic/dark design.
 */
test("appearance follows system, persists, and hides Companion without hiding notices", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/settings/appearance/");
  await expect(page.getByRole("region", { name: "外觀設定" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-visual-style", "minimal");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByLabel("明暗模式").selectOption("system");
  await page.getByLabel("顯示 Companion（原有偏好）").uncheck();
  await page.getByRole("button", { name: "儲存並套用" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return stored.appearance?.showCompanion;
  }, DATA_KEY)).toBe(false);

  await page.reload();
  await expect(page.getByLabel("顯示 Companion（原有偏好）")).not.toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.goto("/today/");
  await expect(page.getByTestId("today-v3")).toBeVisible();
  await expect(page.locator(".companion-three")).toHaveCount(0);
  await expect(page.locator(".today-v3-notice")).toBeVisible();
  for (const route of ["today", "nutrition", "training", "progress", "settings/appearance"]) {
    await page.goto(`/${route}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.screenshot({ path: "test-results/appearance-light.png", fullPage: true });

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "test-results/appearance-dark.png", fullPage: true });
});

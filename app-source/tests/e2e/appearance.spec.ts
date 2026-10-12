import { test, expect } from "@playwright/test";
test("appearance persists, follows system, hides companion without hiding notices", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/settings/appearance/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("顯示模式").selectOption("system");
  await page.getByLabel("顯示 Companion").uncheck();
  await page.getByRole("button", { name: "儲存外觀" }).click();
  await expect(page).toHaveURL(/settings\/appearance/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByLabel("顯示 Companion")).not.toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/today/");
  await expect(page.locator(".companion-three")).toHaveCount(0);
  await expect(page.locator(".notice-carousel")).toBeVisible();
  for (const route of [
    "today",
    "nutrition",
    "training",
    "progress",
    "settings/appearance",
  ]) {
    await page.goto(`/${route}/`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.screenshot({
    path: "test-results/appearance-light.png",
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "test-results/appearance-dark.png",
    fullPage: true,
  });
});

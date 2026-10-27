import { test, expect, DATA_KEY } from "./authenticated";

test("developer UI Showcase: inspect real components, states and interaction", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ui-showcase/");
  await expect(page.getByTestId("ui-showcase")).toBeVisible();
  await expect(page.locator(".jfs-ui-surface")).toHaveCount(7);
  await expect(page.getByRole("button", { name: "停用狀態" })).toBeDisabled();
  await page.getByRole("button", { name: /完成一組/ }).click();
  await expect(page.getByRole("status", { name: "" }).first()).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "示範組數進度" })).toHaveAttribute("aria-valuenow", "1");
  await page.getByRole("button", { name: "Nutrition" }).click();
  await expect(page.getByRole("button", { name: "Nutrition" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/ds3-component-showcase-desktop.png", fullPage: true });
});

test("developer UI Showcase: mobile layout has usable controls and no overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ui-showcase/");
  await expect(page.getByTestId("ui-showcase")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/ds3-component-showcase-mobile.png", fullPage: true });
});

test("Nutrition 3.0: reads true account totals and opens the existing meal entry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nutrition/");
  await expect(page.getByTestId("nutrition-v3b")).toBeVisible();
  await expect(page.getByRole("button", { name: "加入飲食", exact: true })).toHaveCount(1);
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}").meals?.length ?? 0, DATA_KEY);
  await page.getByRole("button", { name: "加入飲食", exact: true }).click();
  await expect(page.getByLabel("加入哪一餐")).toBeVisible();
  await page.getByRole("button", { name: /Quick Macro/ }).click();
  await page.getByRole("textbox", { name: "這餐吃了什麼" }).fill("測試早餐");
  await page.getByRole("spinbutton", { name: "蛋白質 g" }).fill("20");
  await page.getByRole("spinbutton", { name: "碳水 g" }).fill("30");
  await page.getByRole("spinbutton", { name: "脂肪 g" }).fill("10");
  await page.getByRole("button", { name: "加入 Quick Macro 至清單", exact: true }).click();
  await page.getByRole("button", { name: "確認加入 1 項食物", exact: true }).click();
  await expect(page.getByTestId("nutrition-v3b")).toContainText("今日 1 筆飲食紀錄");
  await expect(page.getByTestId("nutrition-v3b")).toContainText("290");
  await page.reload();
  await expect(page.getByTestId("nutrition-v3b")).toContainText("290");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}").meals?.length ?? 0, DATA_KEY)).toBe(before + 1);
});

for (const width of [375, 768, 1440]) {
  test(`Nutrition 3.0: responsive real dashboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/nutrition/");
    await expect(page.getByTestId("nutrition-v3b")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (width === 1440) await page.screenshot({ path: "test-results/nutrition-v3-desktop.png", fullPage: true });
    if (width === 375) await page.screenshot({ path: "test-results/nutrition-v3-mobile.png", fullPage: true });
  });
}

import { test, expect, DATA_KEY } from "./authenticated";

/**
 * Current authenticated/local-only flows. Historic unauthenticated onboarding
 * selectors no longer represent the live product; onboarding is covered
 * independently. All checks use the isolated synthetic account fixture.
 */
test("mobile: water and meal records persist for the account across reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/today/");
  await expect(page.getByTestId("today-v3")).toBeVisible();

  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  await expect.poll(() => page.evaluate(key => {
    const s = JSON.parse(localStorage.getItem(key) || "{}");
    return (s.waters || []).reduce((sum: number, r: { ml: number }) => sum + r.ml, 0);
  }, DATA_KEY)).toBe(250);
  await page.reload();
  await expect(page.getByTestId("today-v3")).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}").waters.length, DATA_KEY)).toBe(1);

  await page.goto("/nutrition/");
  await expect(page.getByTestId("nutrition-v3b")).toBeVisible();
  await page.getByRole("button", { name: "加入飲食", exact: true }).click();
  await expect(page.getByLabel("加入哪一餐")).toBeVisible();
  await page.getByRole("button", { name: /Quick Macro/ }).click();
  await page.getByRole("textbox", { name: "這餐吃了什麼" }).fill("測試便當");
  await page.getByRole("spinbutton", { name: "蛋白質 g" }).fill("20");
  await page.getByRole("spinbutton", { name: "碳水 g" }).fill("30");
  await page.getByRole("spinbutton", { name: "脂肪 g" }).fill("10");
  await page.getByRole("button", { name: "加入紀錄", exact: true }).click();
  await expect(page.getByTestId("nutrition-v3b")).toContainText("290");
  await page.reload();
  await expect(page.getByTestId("nutrition-v3b")).toContainText("290");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}").meals.length, DATA_KEY)).toBe(1);

  await page.goto("/nutrition/foods/");
  await expect(page.getByLabel("搜尋食物")).toBeVisible();
  await page.getByLabel("搜尋食物").fill("oats");
  await expect(page.getByText("燕麥（乾）", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("progress: empty-state information and knowledge article render on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/progress/");
  await expect(page.locator(".main")).toBeVisible();
  await expect(page.locator(".daily-page")).toBeVisible();
  await page.goto("/progress/body/");
  await expect(page.locator(".main")).toBeVisible();
  await page.goto("/knowledge/recovery-adaptation/");
  await expect(page.locator(".article-body")).toBeVisible();
  await expect(page.locator(".article-body")).toContainText(/Recovery|恢復|適應/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test("legacy and current workspace routes render without horizontal overflow", async ({ page }) => {
  // This deliberately checks 48 navigations; avoid hiding real regressions in a 15s per-test deadline.
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "today", "nutrition", "nutrition/plan", "nutrition/foods",
      "nutrition/recipes", "training", "training/cycle", "training/templates",
      "training/exercises", "training/warmups", "training/activity",
      "progress", "progress/body", "progress/weekly", "progress/nutrition",
      "progress/training", "progress/recovery", "progress/history",
      "progress/recommendations", "learn", "settings", "settings/privacy",
      "settings/data", "profile",
    ]) {
      await page.goto("/" + path + "/");
      await expect(page.locator(".main")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path + " should fit the viewport").toBeTruthy();
    }
  }
  expect(errors).toEqual([]);
});

test("meal templates can be edited and the new slot persists with a real meal", async ({ page }) => {
  await page.goto("/nutrition/meals/");
  await expect(page.getByRole("heading", { name: "每日餐次" })).toBeVisible();
  await page.getByRole("button", { name: "＋ 新增餐次" }).click();
  await page.getByLabel("餐次名稱").fill("午-加餐");
  await page.getByRole("button", { name: "新增餐次", exact: true }).click();
  await expect(page.getByRole("button", { name: "修改午-加餐名稱" })).toBeVisible();

  await page.goto("/nutrition/");
  await page.getByRole("button", { name: "加入飲食", exact: true }).click();
  await page.getByLabel("加入哪一餐").selectOption("午-加餐");
  await page.getByRole("button", { name: /Quick Macro/ }).click();
  await page.getByRole("textbox", { name: "這餐吃了什麼" }).fill("訓練後餐");
  await page.getByRole("spinbutton", { name: "蛋白質 g" }).fill("30");
  await page.getByRole("spinbutton", { name: "碳水 g" }).fill("0");
  await page.getByRole("spinbutton", { name: "脂肪 g" }).fill("3.5");
  await page.getByRole("button", { name: "加入紀錄", exact: true }).click();

  await expect.poll(() => page.evaluate(key => {
    const s = JSON.parse(localStorage.getItem(key) || "{}");
    return s.meals?.find((m: { name: string }) => m.name === "訓練後餐")?.slot ?? null;
  }, DATA_KEY)).toBe("午-加餐");
  await page.reload();
  await expect(page.getByTestId("nutrition-v3b")).toBeVisible();
  expect(await page.evaluate(key => {
    const s = JSON.parse(localStorage.getItem(key) || "{}");
    return s.mealSlots.includes("午-加餐") &&
      s.meals.some((m: { slot: string; p: number }) => m.slot === "午-加餐" && m.p === 30);
  }, DATA_KEY)).toBe(true);
});

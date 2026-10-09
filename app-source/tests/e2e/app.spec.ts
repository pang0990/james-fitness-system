import { test, expect } from "@playwright/test";
test("mobile CUT onboarding, food revision, water, persistence, training", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/onboarding/");
  await page.getByLabel("稱呼", { exact: true }).fill("Tester");
  await page.getByLabel("年齡").fill("30");
  await page.getByLabel("身高 cm").fill("175");
  await page.getByLabel("目前體重 kg").fill("63");
  await page.getByLabel("每週運動").selectOption("3");
  await page.getByLabel("我是成人").check();
  await page.getByRole("button", { name: "查看資料與計畫預覽" }).click();
  await expect(page.getByText("1903 kcal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "確認並開始" }).click();
  await expect(
    page.getByRole("heading", { name: "Tester，今天也為自己。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  await expect(page.locator(".water-number").first()).toContainText("0.25");
  await page.goto("/nutrition/log/");
  await page.getByLabel("這餐吃了什麼").fill("午餐便當");
  await page.getByLabel("蛋白質 g", { exact: true }).fill("30");
  await page.getByLabel("碳水 g", { exact: true }).fill("60");
  await page.getByLabel("脂肪 g", { exact: true }).fill("15");
  await page.getByRole("button", { name: "加入紀錄" }).click();
  await expect(
    page.getByRole("heading", { name: "午餐便當", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "午餐便當", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "修正", exact: true }).click();
  await page.getByLabel("蛋白質 g", { exact: true }).fill("35");
  await page.getByRole("button", { name: "保存修正" }).click();
  await expect(page.getByText("P 35 C 60 F 15", { exact: true })).toBeVisible();
  await page.goto("/training/session/");
  await page.getByLabel("本次訓練名稱").fill("Upper A");
  await page.getByRole("button", { name: "開始訓練", exact: true }).click();
  await page.getByLabel("新增當次動作").fill("臥推");
  await page.getByRole("button", { name: "加入動作" }).click();
  await page.getByLabel("重量 kg").fill("40");
  await page.getByLabel("次數", { exact: true }).fill("8");
  await page.getByRole("button", { name: "保存這一組" }).click();
  await expect(page.getByText("1 · WORKING")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 · WORKING")).toBeVisible();
  await page.getByRole("button", { name: "完成訓練", exact: true }).click();
  await expect(page.getByText("1 個動作 · 1 工作組")).toBeVisible();
  await page.goto("/today/");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({ path: "../work/mobile-today.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("all primary and secondary routes render without client errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "today",
    "nutrition",
    "nutrition/plan",
    "nutrition/foods",
    "nutrition/recipes",
    "training",
    "training/cycle",
    "training/templates",
    "training/exercises",
    "training/warmups",
    "training/activity",
    "progress",
    "progress/body",
    "progress/weekly",
    "progress/nutrition",
    "progress/training",
    "progress/recovery",
    "progress/history",
    "progress/recommendations",
    "learn",
    "settings",
    "settings/privacy",
    "settings/data",
    "login",
  ]) {
    await page.goto("/" + path + "/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 1440);
  }
  await page.goto("/today/");
  await page.screenshot({ path: "../work/desktop-today.png", fullPage: true });
  expect(errors).toEqual([]);
});

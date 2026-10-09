import { test, expect } from "@playwright/test";
async function setup(page: any) {
  await page.goto("/onboarding/");
  await page.getByLabel("稱呼", { exact: true }).fill("Tester");
  await page.getByLabel("年齡").fill("30");
  await page.getByLabel("身高 cm").fill("175");
  await page.getByLabel("目前體重 kg").fill("63");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByLabel("每週運動").selectOption("3");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByLabel("我是成人").check();
  await page.getByRole("button", { name: "查看資料與計畫預覽" }).click();
  await expect(page.getByText("1903 kcal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "確認並開始" }).click();
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
}
test("mobile: target binding, food menus, revisions, water and persistence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect(page.getByText("/ 220.5 g", { exact: true })).toBeVisible();
  await expect(page.getByText("你的資料，留在這裡。")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /電子寵物/ })).toBeVisible();
  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  await page.getByRole("button", { name: "修正飲水", exact: true }).click();
  await page.getByLabel("今日總飲水量 ml").fill("500");
  await page.getByRole("button", { name: "保存修正", exact: true }).click();
  await expect(page.locator(".water-number")).toContainText("0.5");
  await page.goto("/nutrition/");
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "新增飲食", exact: true }).click();
  await page.getByRole("button", { name: "早餐", exact: true }).click();
  await page.getByRole("button", { name: "Quick Macro" }).click();
  await page.getByLabel("這餐吃了什麼").fill("午餐便當");
  await page.getByLabel("蛋白質 g", { exact: true }).fill("30");
  await page.getByLabel("碳水 g", { exact: true }).fill("60");
  await page.getByLabel("脂肪 g", { exact: true }).fill("15");
  await page.getByRole("button", { name: "加入紀錄", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "修正", exact: true }).click();
  await page.getByLabel("蛋白質 g", { exact: true }).fill("35");
  await page.getByRole("button", { name: "保存修正", exact: true }).click();
  await expect(page.getByText("P 35 C 60 F 15", { exact: true })).toBeVisible();
  await page.goto("/nutrition/foods/");
  await expect(page.locator(".food-list li")).toHaveCount(30);
  await page
    .getByRole("combobox", { name: "食物分類", exact: true })
    .selectOption("碳水化合物");
  await page.getByLabel("搜尋食物", { exact: true }).fill("oats");
  await expect(page.getByText("燕麥（乾）", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /燕麥（乾）/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("食用量 g").fill("50");
  await expect(page.locator(".portion-preview")).toContainText("188.5 kcal");
  await page.getByRole("button", { name: "加入紀錄", exact: true }).click();
  await page.goto("/today/");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({ path: "../work/v2-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("cycle flow, warmup, segment linking and completion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/training/");
  await page.getByRole("button", { name: "設定 Cycle", exact: true }).click();
  await page
    .getByRole("button", { name: "確認建立 Cycle", exact: true })
    .click();
  await page.getByRole("button", { name: "開始訓練", exact: true }).click();
  await page.getByRole("button", { name: "完成暖身", exact: true }).click();
  await page
    .getByRole("button", { name: "加入動作", exact: true })
    .first()
    .click();
  await page.getByLabel("動作名稱").fill("臥推");
  await page.getByLabel("啟用 Rest-Pause").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "加入動作", exact: true })
    .click();
  await page.getByLabel("重量 kg").fill("40");
  await page.getByLabel("次數", { exact: true }).fill("8");
  await page.getByRole("button", { name: "保存這一組", exact: true }).click();
  await expect(page.getByText("1 · WORKING")).toBeVisible();
  await page
    .getByRole("combobox", { name: "組型", exact: true })
    .selectOption("rp");
  await page.getByLabel("所屬工作組").selectOption({ index: 1 });
  await page.getByLabel("次數", { exact: true }).fill("3");
  await page.getByRole("button", { name: "保存這一組", exact: true }).click();
  await page.reload();
  await expect(page.getByText("2 · RP")).toBeVisible();
  await page.getByRole("button", { name: "訓練回顧", exact: true }).click();
  await page.getByRole("button", { name: "完成訓練", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "訓練完成", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "查看下一個訓練日 →" }).click();
  await expect(
    page.getByRole("heading", { name: "Day 2 · Lower A", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "../work/v2-training.png", fullPage: true });
});
test("progress: missing data, individual curves, article reading and mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await page.goto("/progress/");
  await expect(page.locator(".status-row")).toHaveCount(4);
  await expect(page.locator(".trend-card")).toHaveCount(0);
  await page.getByRole("link", { name: /BODY/ }).click();
  await page.getByRole("button", { name: "體重", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".chart-values")).toContainText("63 kg");
  await page.keyboard.press("Escape");
  await page.goto("/learn/");
  await page.getByRole("link", { name: /Recovery 與 Adaptation/ }).click();
  await expect(page.locator(".article-body")).toContainText("Recovery");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({ path: "../work/v2-article.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("all routes render with no horizontal overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
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
      "profile",
    ]) {
      await page.goto("/" + path + "/");
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
    }
  }
  await page.goto("/today/");
  await page.screenshot({ path: "../work/v2-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("meal preferences persist and protein converts back to cooked portion", async ({
  page,
}) => {
  await page.goto("/nutrition/");
  await page.getByRole("button", { name: "編輯餐次", exact: true }).click();
  await page.getByLabel("每日餐次").fill("第一餐\n午-加餐\n晚餐");
  await page.getByRole("button", { name: "保存餐次" }).click();
  await page.getByRole("button", { name: "午-加餐", exact: true }).click();
  await page.getByRole("button", { name: "James Foods" }).click();
  await page
    .getByLabel("搜尋食物", { exact: true })
    .fill("雞胸肉（去皮，烤熟）");
  await page.getByRole("button", { name: /雞胸肉（去皮，烤熟）/ }).click();
  await page.getByLabel("想攝取蛋白質 g").fill("30");
  await expect(page.getByLabel("食用量 g")).toHaveValue("96.7");
  await page.getByRole("button", { name: "加入紀錄", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "午-加餐", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "早餐", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("P 30 C 0 F 3.5", { exact: true })).toBeVisible();
});
test("cycle can be corrected, calendar rest does not advance cycle", async ({
  page,
}) => {
  await page.goto("/training/");
  await page.getByRole("button", { name: "設定 Cycle", exact: true }).click();
  await page.getByLabel("分化方式").selectOption("五分化");
  await expect(page.getByLabel("訓練日順序")).toHaveValue(
    "Chest\nBack\nLegs\nShoulders\nArms",
  );
  await page
    .getByRole("button", { name: "確認建立 Cycle", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Day 1 · Chest", exact: true }),
  ).toBeVisible();
  await page.locator(".month-grid button").nth(0).click();
  await page.getByRole("button", { name: "Rest Day", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Day 1 · Chest", exact: true }),
  ).toBeVisible();
  await page.goto("/training/cycle/");
  await page.getByLabel("分化方式").selectOption("PPL");
  await page
    .getByRole("button", { name: "確認建立 Cycle", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Day 1 · Push", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("james-fitness-v1")!).cycles.length,
    ),
  ).toBe(2);
});

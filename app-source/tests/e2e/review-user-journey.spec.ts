import { test, expect } from "@playwright/test";
import { REVIEW_STORAGE_KEY } from "../../src/lib/review-preview";

test.skip(process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW !== "1",
  "An isolated build with an explicitly synthetic identity is required.");

test.use({ viewport: { width: 390, height: 844 } });

const readState = (page: import("@playwright/test").Page) =>
  page.evaluate(key => JSON.parse(localStorage.getItem(key)!), REVIEW_STORAGE_KEY);

test("Today -> Nutrition: save, edit, refresh and back without losing synthetic data", async ({ page }) => {
  await page.goto("/today/");
  await expect(page.getByTestId("jfs-review-banner")).toBeVisible();
  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  await expect(page.locator(".today-v3-water-total strong")).toContainText("1,000");
  const mobile = page.getByRole("navigation", { name: "手機主導覽" });
  await expect(mobile).toBeVisible();
  await mobile.getByRole("link", { name: /^nutrition$/i }).click();
  await expect(page).toHaveURL(/\/nutrition\/?$/);

  await page.getByRole("button", { name: "加入飲食", exact: true }).click();
  await page.getByRole("button", { name: /Quick Macro/ }).click();
  await page.getByRole("textbox", { name: "這餐吃了什麼" }).fill("QA 虛構測試餐");
  await page.getByRole("spinbutton", { name: "蛋白質 g" }).fill("22");
  await page.getByRole("spinbutton", { name: "碳水 g" }).fill("33");
  await page.getByRole("spinbutton", { name: "脂肪 g" }).fill("11");
  await page.getByRole("button", { name: "加入 Quick Macro 至清單" }).click();
  await page.getByRole("button", { name: /確認加入 1 項食物/ }).click();
  await expect(page.locator(".meal-entry").filter({ hasText: "QA 虛構測試餐" })).toBeVisible();
  await expect.poll(async () => (await readState(page)).meals.length).toBe(3);

  await page.locator(".meal-entry").filter({ hasText: "QA 虛構測試餐" })
    .getByRole("button", { name: "修正" }).click();
  await page.getByRole("spinbutton", { name: "蛋白質 g" }).fill("27");
  await page.getByRole("button", { name: "保存修正" }).click();
  await expect(page.locator(".meal-entry").filter({ hasText: "QA 虛構測試餐" })).toContainText("P 27");
  await page.reload();
  await expect(page.locator(".meal-entry").filter({ hasText: "QA 虛構測試餐" })).toContainText("P 27");
  const state = await readState(page);
  expect(state.meals).toHaveLength(4); // Corrective append-only lineage.
  expect(state.meals.filter((x: { supersedes?: string }) => x.supersedes)).toHaveLength(1);

  await mobile.getByRole("link", { name: /^today$/i }).click();
  await expect(page.locator(".today-v3-water-total strong")).toContainText("1,000");
  expect((await readState(page)).revision).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("Training -> Today -> Progress: finish incomplete workout without double advancing Cycle", async ({ page }) => {
  await page.goto("/training/");
  await expect(page.locator(".training-v3-exercises")).toBeVisible();
  await page.getByRole("button", { name: /開始訓練/ }).click();
  await expect(page).toHaveURL(/\/training\/session\/?$/);
  const beforeReload = await readState(page);
  expect(beforeReload.sessions.filter((s: {status:string}) => s.status==="in_progress")).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Active Workout" })).toBeVisible();
  await page.getByRole("button", { name: "略過暖身" }).click();
  await page.getByRole("button", { name: /訓練回顧/ }).click();
  await expect(page.getByText(/尚有.*組未完成/)).toBeVisible();
  await page.getByRole("radio", { name: /只保存本次訓練/ }).check();
  await page.getByRole("button", { name: /完成訓練/ }).click();
  await expect(page.getByRole("heading", { name: "訓練完成" })).toBeVisible();
  const finished = await readState(page);
  expect(finished.sessions.filter((s: {status:string}) => s.status==="completed")).toHaveLength(3);
  expect(finished.sessions.at(-1).cycleCounted).toBe(false);
  expect(finished.cycles[0].pending).toEqual(["review-upper","review-lower"]);
  expect(finished.cycles[0].round).toBe(2);
  expect(finished.cycleEvents).toHaveLength(0);
  await page.getByRole("link", { name: "返回 Today" }).click();
  await expect(page).toHaveURL(/\/today\/?$/);
  await expect(page.locator(".today-v3-cycle")).toContainText("Cycle 02");
  await page.getByRole("link", { name: /查看訓練紀錄/ }).click();
  await expect(page).toHaveURL(/\/training\/history\/?$/);
  await page.goBack();
  await page.getByRole("navigation", { name: "手機主導覽" })
    .getByRole("link", { name: /^progress$/i }).click();
  const stats = page.locator(".progress-v3-stats");
  await expect(stats.locator(".progress-v3-stat-row").first().locator("strong")).toHaveText("3");
  await page.reload();
  await expect(stats.locator(".progress-v3-stat-row").first().locator("strong")).toHaveText("3");
});

test("Progress: date range, detail/back and both small viewports remain usable", async ({ page }) => {
  for (const width of [375, 390, 768] ) {
    await page.setViewportSize({width,height:844});
    await page.goto("/progress/");
    const controls = page.getByRole("group", {name:"趨勢圖期間"});
    const sessions = page.locator(".progress-v3-stats .progress-v3-stat-row").first().locator("strong");
    await controls.getByRole("button", {name:"30D"}).click();
    await expect(sessions).toHaveText("2");
    await controls.getByRole("button", {name:"7D"}).click();
    await expect(sessions).toHaveText("0");
    await page.getByRole("link", {name:"Body", exact:true}).click();
    await expect(page).toHaveURL(/\/progress\/body\/?$/);
    await page.goBack();
    await expect(page.locator(".progress-direction")).toBeVisible();
    await expect(page.getByTestId("jfs-review-banner")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
});

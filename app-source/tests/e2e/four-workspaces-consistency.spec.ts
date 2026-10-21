import { test, expect, DATA_KEY } from "./authenticated";
import { addDays, dateInZone } from "../../src/lib/domain";

const today = dateInZone("Asia/Taipei");

test("Today uses the Cycle round and completed workout CTA opens History", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  await page.evaluate(({ key, date }) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cycles = [{
      id: "cycle-ui-test", name: "測試分化", createdAt: date + "T12:00:00.000Z",
      round: 3, days: [{ id: "day-ui", name: "上肢" }], pending: ["day-ui"],
    }];
    state.sessions = [{
      id: "completed-ui-test", date, name: "今日上肢",
      status: "completed", createdAt: date + "T10:00:00.000Z",
      completedAt: date + "T11:00:00.000Z", activeDuration: 3600000,
      exercises: [],
    }];
    localStorage.setItem(key, JSON.stringify(state));
  }, {key: DATA_KEY, date: today});
  await page.reload();
  await expect(page.locator(".today-v3-cycle")).toContainText("Cycle 03");
  const action = page.getByRole("link", { name: /查看訓練紀錄/ });
  await expect(action).toHaveAttribute("href", /\/training\/history\/?$/);
  await action.click();
  await expect(page).toHaveURL(/\/training\/history\/?$/);
});

test("Progress period controls the workout comparisons and step average, not Review window", async ({ page }) => {
  await page.goto("/progress/");
  const older = addDays(today, -20);
  const recent = addDays(today, -5);
  await page.evaluate(({ key, dates }) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.sessions = dates.map((day: string, index: number) => ({
      id: "session-range-" + index, name: "測試胸推", date: day,
      status: "completed", createdAt: day + "T10:00:00.000Z",
      completedAt: day + "T11:00:00.000Z",
      exercises: [{
        id: "exercise-" + index, name: "Bench Press", exerciseLibraryId: "bench-test",
        sets: [{id:"set-" + index, weight: 50 + index * 10, reps: 8,
          rir: null, type: "working", createdAt: day + "T10:30:00.000Z"}],
      }],
    }));
    state.dailySteps = dates.map((day: string, index: number) => ({
      id: "steps-" + index, date: day, steps: 3000 - index * 2000,
      source: "manual", updatedAt: day + "T12:00:00.000Z",
    }));
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: DATA_KEY, dates: [older, recent] });
  await page.reload();
  const stats = page.locator(".progress-v3-stats");
  const range = page.getByRole("group", { name: "趨勢圖期間" });
  await expect(stats.locator(".progress-v3-stat-row").nth(2).locator("strong")).toHaveText("2,000");
  await expect(page.locator(".training-evidence .performance-row")).toHaveCount(1);
  await range.getByRole("button", { name: "7D" }).click();
  await expect(stats.locator(".progress-v3-stat-row").nth(2).locator("strong")).toHaveText("1,000");
  await expect(page.locator(".training-evidence .performance-row")).toHaveCount(0);
  await expect(page.locator(".review-glass")).toContainText(/10.*天完整飲食紀錄/);
});

test("Nutrition rejects out-of-range single meal without writing a record", async ({ page }) => {
  await page.goto("/nutrition/");
  await page.getByRole("button", { name: "加入飲食", exact: true }).click();
  await page.getByRole("button", { name: /Quick Macro/ }).click();
  await page.getByRole("textbox", { name: "這餐吃了什麼" }).fill("測試餐");
  await page.getByRole("spinbutton", { name: "蛋白質 g" }).fill("1001");
  await page.getByRole("spinbutton", { name: "碳水 g" }).fill("30");
  await page.getByRole("spinbutton", { name: "脂肪 g" }).fill("10");
  await page.getByRole("button", { name: "加入紀錄" }).click();
  expect(await page.getByRole("spinbutton", { name: "蛋白質 g" }).evaluate(input => (input as HTMLInputElement).validity.rangeOverflow)).toBe(true);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}").meals.length, DATA_KEY)).toBe(0);
  await page.getByRole("spinbutton", { name: "蛋白質 g" }).fill("20");
  await page.getByRole("button", { name: "加入紀錄" }).click();
  await expect(page.getByTestId("nutrition-v3b")).toContainText("290");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}").meals.length, DATA_KEY)).toBe(1);
});

test("Training home exercise opens its stable-ID guide instead of the plan editor", async ({ page }) => {
  await page.goto("/training/");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cycles = [{
      id: "cycle-detail", name: "測試課表", round: 1,
      createdAt: new Date().toISOString(), pending: ["day-detail"],
      days: [{id: "day-detail", name: "胸部", exercises: [{
        exerciseLibraryId: "exercise-1", name: "Barbell Bench Press",
        muscle: "Chest", sets: 3, reps: "8", restSeconds: 120,
        allowRestPause: false, allowDropSet: false,
      }]}],
    }];
    localStorage.setItem(key, JSON.stringify(state));
  }, DATA_KEY);
  await page.reload();
  const link = page.getByRole("link", { name: "查看Barbell Bench Press動作詳情" });
  await expect(link).toHaveAttribute("href", /training\/exercises\/detail\/?\?id=exercise-1/);
  await link.click();
  await expect(page).toHaveURL(/\/training\/exercises\/detail\/?\?id=exercise-1/);
  await expect(page.getByRole("heading", { name: "Barbell Bench Press" })).toBeVisible();
});

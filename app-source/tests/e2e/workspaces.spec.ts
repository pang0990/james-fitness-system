import { test, expect, DATA_KEY } from "./authenticated";
import { initialState } from "../../src/lib/domain";
import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";

/** Current account-scoped fixtures, never the unowned legacy localStorage key. */
async function seed(page: Page) {
  const data = initialState();
  data.profile = {
    name: "Tester",
    age: 30,
    height: 175,
    weight: 70,
    sex: "male",
    frequency: 1,
    experiencedCut: false,
    goal: "CUT",
    eligible: true,
    timezone: "Asia/Taipei",
    waterTarget: 2500,
  };
  await page.goto("/today/");
  await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: DATA_KEY, data });
  await page.reload();
  await expect(page.getByTestId("today-v3")).toBeVisible();
}
async function stored(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}"), DATA_KEY);
}
async function createPplPlan(page: Page) {
  await page.goto("/training/plan/");
  await page.getByRole("combobox", { name: "選擇分化" }).selectOption("PPL");
  await expect(page.getByText("Bench Press", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "儲存計畫版本" }).click();
  await expect.poll(async () => (await stored(page)).cycles?.length ?? 0).toBe(1);
}

test("legacy aliases, profile edits and mobile workspaces remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  for (const [old, next] of [
    ["training/cycle", "training/plan"],
    ["training/templates", "training/plan"],
    ["progress/weekly", "progress/check-in"],
    ["progress/recommendations", "progress/review"],
    ["signup", "login"],
    ["nutrition/log", "nutrition"],
  ]) {
    await page.goto("/" + old + "/");
    await expect(page).toHaveURL(new RegExp("/" + next + "/?$"));
  }
  await page.goto("/settings/profile/");
  await page.getByLabel("稱呼", { exact: true }).fill("Updated");
  await page.getByRole("button", { name: "儲存設定" }).click();
  await expect.poll(async () => (await stored(page)).profile?.name).toBe("Updated");
  await page.reload();
  await expect(page.getByLabel("稱呼", { exact: true })).toHaveValue("Updated");
  for (const route of [
    "settings", "settings/body", "settings/nutrition", "settings/training",
    "settings/recovery", "settings/notifications", "settings/accessibility",
    "settings/about", "settings/data", "training/calendar", "training/history",
    "nutrition/meals", "progress/recovery",
  ]) {
    await page.goto("/" + route + "/");
    await expect(page.locator(".main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test("PPL template, pause, discard and completion advance only the intended Cycle day", async ({ page }) => {
  await seed(page);
  await createPplPlan(page);
  await page.goto("/training/");
  await page.getByRole("button", { name: "開始訓練", exact: true }).click();
  await page.getByRole("button", { name: "略過暖身", exact: true }).click();
  await page.getByRole("button", { name: "暫停訓練", exact: true }).click();
  await expect(page.getByRole("button", { name: "完成這一組", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "繼續訓練", exact: true }).click();
  await page.locator('.workout-set-entry input[name="weight"]').fill("40");
  await page.locator('.workout-set-entry input[name="reps"]').fill("8");
  await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  await expect(page.locator(".set-history .session-set")).toHaveCount(1);
  const pendingBefore = (await stored(page)).cycles[0].pending;

  await page.getByLabel("更多訓練操作").click();
  page.once("dialog", d => d.accept());
  await page.getByRole("button", { name: "放棄本次訓練" }).click();
  expect((await stored(page)).cycles[0].pending).toEqual(pendingBefore);
  await page.goto("/training/");
  await page.getByRole("button", { name: "開始訓練", exact: true }).click();
  await page.getByRole("button", { name: "略過暖身", exact: true }).click();
  await page.locator('.workout-set-entry input[name="weight"]').fill("40");
  await page.locator('.workout-set-entry input[name="reps"]').fill("8");
  await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  await page.getByRole("button", { name: "訓練回顧", exact: true }).click();
  await page.getByLabel("視為完成，推進到下一個 Cycle Day").check();
  await page.getByRole("button", { name: "完成訓練", exact: true }).click();
  const after = await stored(page);
  expect(after.sessions.filter((s: { status: string }) => s.status === "discarded")).toHaveLength(1);
  expect(after.sessions.filter((s: { status: string }) => s.status === "completed")).toHaveLength(1);
  expect(after.cycles[0].pending).not.toEqual(pendingBefore);
});

test("Today recovery quick-log and Nutrition macro persist without leaving stale sheets", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "記錄睡眠" }).click();
  await page.getByRole("radio", { name: "3", exact: true }).check();
  await page.getByRole("button", { name: "儲存並關閉" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await stored(page)).recoveryEntries.some((r: { type: string; value: number }) =>
    r.type === "sleep" && r.value === 3)).toBe(true);
  await page.goto("/nutrition/");
  await page.getByRole("button", { name: "加入飲食", exact: true }).click();
  await page.getByRole("button", { name: /Quick Macro/ }).click();
  await page.getByRole("textbox", { name: "這餐吃了什麼" }).fill("測試早餐");
  await page.getByRole("spinbutton", { name: "蛋白質 g" }).fill("30");
  await page.getByRole("spinbutton", { name: "碳水 g" }).fill("40");
  await page.getByRole("spinbutton", { name: "脂肪 g" }).fill("10");
  await page.getByRole("button", { name: "加入紀錄" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  expect((await stored(page)).meals).toHaveLength(1);
  await page.goto("/progress/recovery/");
  await expect(page.locator(".recovery-entry-grid")).toContainText("3 / 5");
});

test("invalid backup is rejected; valid restore saves downloadable pre-restore copy", async ({ page }) => {
  await seed(page);
  await page.goto("/settings/data/");
  const before = await stored(page);
  await page.getByLabel("匯入 JSON 備份").setInputFiles({
    name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{}"),
  });
  await expect(page.getByRole("alert")).toContainText("備份格式無效");
  expect(await stored(page)).toEqual(before);
  const restored = structuredClone(before);
  restored.mealSlots = ["First Meal"];
  await page.getByLabel("匯入 JSON 備份").setInputFiles({
    name: "backup.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(restored)),
  });
  page.once("dialog", d => d.accept());
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "確認還原備份" }).click();
  const copy = JSON.parse(await readFile((await (await dl).path())!, "utf8"));
  expect(copy.sessions).toEqual(before.sessions);
  expect(copy.cycles).toEqual(before.cycles);
  await page.reload();
  expect((await stored(page)).mealSlots).toEqual(["First Meal"]);
});

test("editing a plan creates a new version without overwriting the active session snapshot", async ({ page }) => {
  await seed(page);
  await createPplPlan(page);
  await page.goto("/training/");
  await page.getByRole("button", { name: "開始訓練", exact: true }).click();
  const before = (await stored(page)).sessions.find((s: { status: string }) => s.status === "in_progress");
  await page.goto("/training/plan/");
  await page.getByLabel("訓練日 1", { exact: true }).fill("Updated Upper");
  await page.getByRole("button", { name: "儲存計畫版本" }).click();
  await expect.poll(async () => (await stored(page)).cycles?.length).toBe(2);
  const current = await stored(page);
  expect(current.sessions.find((s: { status: string }) => s.status === "in_progress")).toEqual(before);
  expect(current.cycles[1].days[0].name).toBe("Updated Upper");
  expect(current.cycles[1].previousId).toBe(current.cycles[0].id);
});

test("recovery ratings persist and Progress can backfill a previous date", async ({ page }) => {
  await seed(page);
  await page.goto("/progress/recovery/");
  for (const type of ["睡眠品質", "疲勞", "肌肉痠痛", "壓力"]) {
    await page.locator(".recovery-entry-grid").getByRole("button", { name: new RegExp(type) }).click();
    await page.getByRole("radio", { name: "3", exact: true }).check();
    if (type === "肌肉痠痛") await page.getByLabel("身體部位").selectOption("肩膀");
    await page.getByRole("button", { name: "儲存並關閉" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect((await stored(page)).recoveryEntries).toHaveLength(4);
  await page.reload();
  await expect(page.locator(".recovery-entry-grid")).toContainText("3 / 5");
  await page.getByLabel("補記日期").fill("2026-10-01");
  await page.locator(".recovery-entry-grid").getByRole("button", { name: /壓力/ }).click();
  await page.getByRole("radio", { name: "2", exact: true }).check();
  await page.getByRole("button", { name: "儲存並關閉" }).click();
  expect((await stored(page)).recoveryEntries.some((r: { date: string; type: string; value: number }) =>
    r.date === "2026-10-01" && r.type === "stress" && r.value === 2)).toBe(true);
});

import { test, expect, DATA_KEY } from "./authenticated";
import { initialState } from "../../src/lib/domain";
async function seed(page: any) {
  await page.goto("/today/");
  const s = initialState();
  s.profile = {
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
  await page.evaluate(
    ({s,key}: any) => localStorage.setItem(key, JSON.stringify(s)),
    {s, key: DATA_KEY},
  );
  await page.reload();
}
test("canonical redirects, settings stay, mobile workspaces", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [old, next] of [
    ["profile", "settings/profile"],
    ["training/cycle", "training/plan"],
    ["training/templates", "training/plan"],
    ["progress/weekly", "progress/review"],
    ["progress/recommendations", "progress/review"],
    ["login", "settings/account"],
    ["signup", "settings/account"],
    ["nutrition/log", "nutrition"],
  ]) {
    await page.goto("/" + old + "/");
    await expect(page).toHaveURL(new RegExp("/" + next + "/?$"));
  }
  await page.goto("/settings/profile/");
  await page.getByLabel("稱呼", { exact: true }).fill("Updated");
  await page.getByRole("button", { name: "儲存設定" }).click();
  await expect(page.locator(".toast")).toHaveText("已儲存");
  await expect(page).toHaveURL(/settings\/profile/);
  await page.reload();
  await expect(page.getByLabel("稱呼", { exact: true })).toHaveValue("Updated");
  for (const route of [
    "settings",
    "settings/body",
    "settings/nutrition",
    "settings/training",
    "settings/recovery",
    "settings/notifications",
    "settings/accessibility",
    "settings/about",
    "settings/data",
    "training/calendar",
    "training/history",
    "nutrition/meals",
    "progress/recovery",
  ]) {
    await page.goto("/" + route + "/");
    await expect(page.locator(".daily-page,.narrow").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
  await page.goto("/settings/");
  await page.screenshot({
    path: "test-results/settings-hub.png",
    fullPage: true,
  });
});
test("templates, pause, discard preserve queue and completion consumes exact day", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/training/plan/");
  await page.getByLabel("選擇模板").selectOption("PPL");
  await page
    .getByRole("button", { name: "使用 Default Template v1.0" })
    .click();
  await expect(page.getByText("Bench Press", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "儲存計畫版本" }).click();
  await expect(page.locator(".toast")).toContainText("新版本");
  await page.goto("/training/");
  await page.getByRole("button", { name: "開始訓練", exact: true }).click();
  await page.getByRole("button", { name: "略過暖身", exact: true }).click();
  await page.getByRole("button", { name: "Pause Workout" }).click();
  await expect(
    page.getByRole("button", { name: "保存這一組", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resume Workout" }).click();
  await page.getByLabel("重量 kg").fill("40");
  await page.getByLabel("次數", { exact: true }).fill("8");
  await page.getByRole("button", { name: "保存這一組", exact: true }).click();
  await page.goto("/training/");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Discard Workout" }).click();
  await expect(
    page.getByRole("heading", { name: "Day 1 · Push", exact: true }),
  ).toBeVisible();
  await page.goto("/training/history/");
  await expect(page.getByText(/已放棄/)).toBeVisible();
  await page.goto("/training/");
  await page.getByRole("button", { name: "開始訓練", exact: true }).click();
  await page.getByRole("button", { name: "略過暖身", exact: true }).click();
  await page.getByLabel("重量 kg").fill("40");
  await page.getByLabel("次數", { exact: true }).fill("8");
  await page.getByRole("button", { name: "保存這一組", exact: true }).click();
  await page.getByRole("button", { name: "訓練回顧", exact: true }).click();
  await page.getByRole("button", { name: "完成訓練", exact: true }).click();
  await page.goto("/training/");
  await expect(
    page.getByRole("heading", { name: "Day 2 · Pull", exact: true }),
  ).toBeVisible();
});
test("Today quick logs stay in Today and independent sleep appears in history", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "記錄恢復", exact: true }).click();
  await page.getByRole("radio", { name: "4", exact: true }).check();
  await page.getByRole("button", { name: "儲存紀錄", exact: true }).click();
  await expect(page).toHaveURL(/today/);
  await page.getByRole("button", { name: "關閉", exact: true }).click();
  await expect(page.getByText("4 / 5", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "記錄飲食", exact: true }).click();
  await page.getByRole("button", { name: "早餐", exact: true }).click();
  await page.getByRole("button", { name: "Quick Macro", exact: true }).click();
  await page.getByLabel("這餐吃了什麼").fill("測試早餐");
  await page.getByLabel("蛋白質 g", { exact: true }).fill("30");
  await page.getByLabel("碳水 g", { exact: true }).fill("40");
  await page.getByLabel("脂肪 g", { exact: true }).fill("10");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /加入|保存/ })
    .last()
    .click();
  await expect(page).toHaveURL(/today/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/progress/recovery/");
  await expect(page.getByText("4/5", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "保存今日狀態" })).toHaveCount(
    0,
  );
});
test("backup restore validates file and preserves a downloadable pre-restore copy", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/settings/data/");
  await page
    .getByLabel("匯入 JSON 備份")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
  await expect(page.locator("p[role=alert]")).toContainText("備份格式無效");
  const data = initialState();
  data.mealSlots = ["First Meal"];
  await page
    .getByLabel("匯入 JSON 備份")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
  page.on("dialog", (d) => d.accept());
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "確認還原備份" }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    "james-before-restore.json",
  );
  await page.goto("/nutrition/meals/");
  await expect(page.getByLabel("每日餐次")).toHaveValue("First Meal");
});
test("editing plan preserves active snapshot; reset explicitly archives old session", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/training/plan/");
  await page
    .getByRole("button", { name: "使用 Default Template v1.0" })
    .click();
  await page.getByRole("button", { name: "儲存計畫版本" }).click();
  await page.goto("/training/");
  await page.getByRole("button", { name: "開始訓練", exact: true }).click();
  const original = await page.evaluate(
    () => JSON.parse(localStorage.getItem("james-fitness-user-v1:00000000-0000-4000-8000-000000000042")!).sessions[0],
  );
  await page.goto("/training/plan/");
  await page.getByLabel("訓練日 1", { exact: true }).fill("Updated Upper");
  await page.getByRole("button", { name: "儲存計畫版本" }).click();
  const retained = await page.evaluate(
    () => JSON.parse(localStorage.getItem("james-fitness-user-v1:00000000-0000-4000-8000-000000000042")!).sessions[0],
  );
  expect(retained).toEqual(original);
  page.on("dialog", (d) => d.accept());
  await page.getByLabel("目前訓練如何處理").selectOption("reset");
  await page.getByRole("button", { name: "儲存計畫版本" }).click();
  const sessions = await page.evaluate(
    () => JSON.parse(localStorage.getItem("james-fitness-user-v1:00000000-0000-4000-8000-000000000042")!).sessions,
  );
  expect(sessions.filter((s: any) => s.status === "in_progress")).toHaveLength(
    1,
  );
  expect(sessions[0].status).toBe("discarded");
  expect(sessions[1].name).toBe("Updated Upper");
});

test("four direct recovery entries persist and Progress supports backfill", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  for (const name of ["睡眠", "疲勞", "肌肉痠痛", "壓力"]) {
    await page.locator(".recovery-entry-grid").getByRole("button", { name: new RegExp(name) }).click();
    await page.getByRole("radio", { name: "3", exact: true }).check();
    await page.getByRole("button", { name: "儲存紀錄", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("已儲存，歷史紀錄保留");
    await page.getByRole("button", { name: "關閉", exact: true }).click();
  }
  await page.reload();
  await expect(page.locator(".recovery-entry-grid strong")).toHaveText(["3 / 5", "3 / 5", "3 / 5", "3 / 5"]);
  await page.goto("/progress/recovery/");
  await page.getByLabel("補記日期").fill("2026-10-01");
  await page.locator(".recovery-entry-grid").getByRole("button", { name: /壓力/ }).click();
  await page.getByRole("radio", { name: "2", exact: true }).check();
  await page.getByRole("button", { name: "儲存紀錄", exact: true }).click();
  await page.getByRole("button", { name: "關閉", exact: true }).click();
  await expect(page.getByText("2026-10-01 · 壓力", { exact: true })).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

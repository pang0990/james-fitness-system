import { test, expect, DATA_KEY } from "./authenticated";
import { trainingFixture, segment } from "../fixtures/training-v3";
import type { AppState } from "../../src/lib/domain";
import type { Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function seed(page: Page, state = trainingFixture()) {
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem("test-training-seeded")) {
        localStorage.setItem(key, JSON.stringify(state));
        localStorage.setItem("test-training-seeded", "yes");
      }
    },
    { key: DATA_KEY, state },
  );
  await page.goto("/training/session/");
  await expect(
    page.getByRole("heading", { name: "Active Workout", exact: true }),
  ).toBeVisible({ timeout: 10000 });
}
async function stored(page: Page): Promise<AppState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    DATA_KEY,
  );
}
async function enter(page: Page, weight = "65", reps = "10") {
  await page.locator('.workout-set-entry input[name="weight"]').fill(weight);
  await page.locator('.workout-set-entry input[name="reps"]').fill(reps);
}
async function shot(page: Page, name: string, testInfo: any) {
  await expect(page.locator(".save-indicator")).toBeHidden();
  const file = process.env.TRAINING_QA_DIR
    ? path.join(process.env.TRAINING_QA_DIR, name + ".png")
    : testInfo.outputPath(name + ".png");
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path: file, contentType: "image/png" });
}
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("mobile: drafts recover across exercises and reload, stable history, duplicate submit and undo", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await expect(page.locator(".exercise-focus")).toContainText("60 kg × 8");
  await enter(page);
  await expect(
    page.getByText("草稿已保存 · 可切換動作或重新開啟", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "下一個動作", exact: true }).click();
  await enter(page, "40", "12");
  await page.getByRole("button", { name: "上一個動作", exact: true }).click();
  await expect(page.locator('input[name="weight"]').first()).toHaveValue("65");
  await page.reload();
  await expect(page.locator('input[name="reps"]').first()).toHaveValue("10");
  await shot(page, "training-v3-mobile-draft", info);
  await page.locator(".workout-set-entry").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.locator(".set-history .session-set")).toHaveCount(1);
  expect((await stored(page)).sessions[1].setSubmissionIds).toHaveLength(1);
  await expect(page.locator(".training-v3-status")).toContainText("休息中");
  await page.getByRole("button", { name: "復原上一組", exact: true }).click();
  await expect(page.locator(".set-history .session-set")).toHaveCount(0);
  expect((await stored(page)).sessions[1].setSubmissionIds).toHaveLength(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test("rest survives pause/reload; edit, delete and restore; partial Cycle confirmation and summary", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  await enter(page);
  await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  await shot(page, "training-v3-desktop-rest", info);
  await page.getByRole("button", { name: "暫停訓練", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "完成這一組", exact: true }),
  ).toBeDisabled();
  const rest = await page.locator(".rest-times").last().innerText();
  await page.waitForTimeout(1100);
  expect(await page.locator(".rest-times").last().innerText()).toBe(rest);
  await page.reload();
  await expect(page.locator(".training-v3-status")).toContainText("已暫停");
  await shot(page, "training-v3-desktop-paused", info);
  await page.getByRole("button", { name: "繼續訓練", exact: true }).click();
  await page
    .locator(".set-history")
    .getByRole("button", { name: "編輯", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("重量 kg", { exact: true }).fill("70");
  await dialog.getByRole("button", { name: /保存|儲存/ }).click();
  await expect(page.locator(".set-history")).toContainText("70 kg × 10");
  await page.getByRole("button", { name: "撤銷編輯", exact: true }).click();
  await expect(page.locator(".set-history")).toContainText("65 kg × 10");
  await page
    .locator(".set-history")
    .getByRole("button", { name: "刪除", exact: true })
    .click();
  await page.getByRole("button", { name: "復原", exact: true }).click();
  await expect(page.locator(".set-history")).toContainText("65 kg × 10");
  await page.getByRole("button", { name: "訓練回顧", exact: true }).click();
  await shot(page, "training-v3-completion-confirm", info);
  await page.getByRole("button", { name: "完成訓練", exact: true }).click();
  expect((await stored(page)).sessions[1].status).toBe("in_progress");
  await page.getByLabel("只保存本次訓練，保留此 Cycle Day 待完成").check();
  await page.getByRole("button", { name: "完成訓練", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "訓練完成", exact: true }),
  ).toBeVisible();
  const state = await stored(page);
  expect(state.sessions[1].status).toBe("completed");
  expect(state.cycles![0].pending).toEqual(["day-a", "day-b"]);
  expect(state.cycleEvents).toHaveLength(0);
  await expect(page.getByRole("link",{name:"查看下一個訓練日 →",exact:true})).toHaveCSS("color","rgb(36, 37, 43)");
  await shot(page, "training-v3-complete-summary", info);
});

test("storage failure retains input, retry succeeds offline and records exactly once", async ({
  page,
  context,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await enter(page);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    (window as any).restoreWrites = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (k, v) {
      if (k === key)
        throw new DOMException("測試儲存空間不足", "QuotaExceededError");
      return original.call(this, k, v);
    };
  }, DATA_KEY);
  await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  await expect(page.locator(".workout-draft-status")).toContainText("保存失敗");
  expect((await stored(page)).sessions[1].exercises[0].sets).toHaveLength(0);
  await expect(page.locator('input[name="weight"]').first()).toHaveValue("65");
  await shot(page, "training-v3-mobile-save-failure", info);
  await page.getByRole("button", { name: "下一個動作", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "胸推", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => (window as any).restoreWrites());
  await page.getByRole("button", { name: "重試保存草稿", exact: true }).click();
  await context.setOffline(true);
  await expect(page.locator(".training-v3-status")).toContainText("離線");
  await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  await expect(page.locator(".set-history .session-set")).toHaveCount(1);
  await shot(page, "training-v3-mobile-offline", info);
  await context.setOffline(false);
});

test("actual JSON download and restore preserve all training records; malformed nested backup does not write", async ({
  page,
}) => {
  const fixture = trainingFixture();
  fixture.sessions[1].exercises[0].sets = [segment()];
  await seed(page, fixture);
  await page.goto("/settings/data/");
  const exportPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "匯出 JSON 備份", exact: true })
    .click();
  const backup = JSON.parse(
    await readFile((await (await exportPromise).path())!, "utf8"),
  );
  expect(backup.sessions).toEqual(fixture.sessions);
  expect(backup.cycles).toEqual(fixture.cycles);
  const invalid = structuredClone(backup);
  invalid.sessions[1].exercises[0].sets[0].reps = -1;
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    DATA_KEY,
  );
  await page.getByLabel("匯入 JSON 備份").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await expect(
    page.getByText("備份格式無效，未更動任何紀錄。", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), DATA_KEY),
  ).toEqual(before);
  // Restore a different valid snapshot through the actual UI.
  const restore = structuredClone(backup);
  restore.sessions[1].exercises[0].sets[0].weight = 72.5;
  await page.getByLabel("匯入 JSON 備份").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(restore)),
  });
  page.once("dialog", (dialog) => dialog.accept());
  const safetyPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "確認還原備份", exact: true }).click();
  const safety = JSON.parse(
    await readFile((await (await safetyPromise).path())!, "utf8"),
  );
  expect(safety.sessions).toEqual(backup.sessions);
  await expect
    .poll(
      async () => (await stored(page)).sessions[1].exercises[0].sets[0].weight,
    )
    .toBe(72.5);
  const after = await stored(page);
  expect(after.sessions).toEqual(restore.sessions);
  expect(after.cycles).toEqual(restore.cycles);
  await page.reload();
  expect((await stored(page)).sessions).toEqual(restore.sessions);
});

test("warmup, RP and Drop linkage and explicit count advance exactly the intended Cycle", async ({
  page,
}) => {
  const fixture = trainingFixture();
  fixture.sessions[1].phase = "warmup";
  await seed(page, fixture);
  await page.getByRole("button", { name: "略過暖身", exact: true }).click();
  await enter(page);
  await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  for (const type of ["rp", "drop"]) {
    await page
      .locator(".workout-set-entry")
      .getByRole("combobox", { name: "組型", exact: true })
      .selectOption(type);
    await enter(page, "40", "6");
    await page
      .getByRole("combobox", { name: "所屬工作組", exact: true })
      .selectOption({ index: 1 });
    await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  }
  const sets = (await stored(page)).sessions[1].exercises[0].sets;
  expect(sets.map((s) => s.type)).toEqual(["working", "rp", "drop"]);
  expect(sets[1].parentId).toBe(sets[0].id);
  await page
    .getByRole("button", { name: "開始 RP 短休息", exact: true })
    .click();
  expect((await stored(page)).sessions[1].restStartedAt).toBeUndefined();
  await page.getByRole("button", { name: "訓練回顧", exact: true }).click();
  await page.getByLabel("視為完成，推進到下一個 Cycle Day").check();
  await page.getByRole("button", { name: "完成訓練", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "訓練完成", exact: true }),
  ).toBeVisible();
  expect((await stored(page)).cycleEvents).toHaveLength(1);
  expect((await stored(page)).cycles![0].pending).toEqual(["day-b"]);
});

test("legacy adoption copies valid old records without modifying the unowned source", async ({
  page,
}) => {
  await page.goto("/training/");
  await expect(page.locator(".training-home")).toBeVisible({ timeout: 10000 });
  const legacy = trainingFixture();
  delete legacy.sessions[0].exercises[0].exerciseLibraryId;
  await page.evaluate(
    (value) => localStorage.setItem("james-fitness-v1", JSON.stringify(value)),
    legacy,
  );
  await page.addInitScript((key) => {
    if (!localStorage.getItem("test-legacy-loaded")) {
      localStorage.removeItem(key);
      localStorage.setItem("test-legacy-loaded", "yes");
    }
  }, DATA_KEY);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "使用舊版紀錄", exact: true }),
  ).toBeVisible();
  const original = await page.evaluate(() =>
    localStorage.getItem("james-fitness-v1"),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "使用舊版紀錄", exact: true }).click();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(2);
  expect((await stored(page)).sessions).toEqual(legacy.sessions);
  expect(
    await page.evaluate(() => localStorage.getItem("james-fitness-v1")),
  ).toBe(original);
});

test("corrupt local Session stops writes and preserves the raw snapshot", async ({
  page,
}) => {
  await seed(page);
  const broken = trainingFixture();
  (broken.sessions[1] as any).exercises = "broken";
  const raw = JSON.stringify(broken);
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
    key: DATA_KEY,
    raw,
  });
  await page.reload();
  await expect(page.getByText(/本機資料無法讀取，已停止寫入/)).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), DATA_KEY),
  ).toBe(raw);
});

for (const width of [375, 390, 430, 768, 1024, 1440])
  test(`viewport ${width}: meaningful glass UI, no overflow or error, keyboard input and focus`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await seed(page);
    await expect(page).toHaveURL(/\/training\/session\/$/);
    await expect(page).toHaveTitle(/Fitness/);
    await expect(page.locator(".exercise-focus")).toBeVisible();
    await page.locator('.workout-set-entry input[name="weight"]').focus();
    await page.keyboard.type("25");
    await page.keyboard.press("Tab");
    await page.keyboard.type("8");
    await expect(
      page.locator('.workout-set-entry input[name="reps"]'),
    ).toHaveValue("8");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      await page
        .locator(".exercise-focus")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).not.toBe("rgb(34, 34, 37)");
    const inputBox = await page
      .locator('.workout-set-entry input[name="reps"]')
      .boundingBox();
    const buttonBox = await page
      .getByRole("button", { name: "完成這一組", exact: true })
      .boundingBox();
    expect(buttonBox!.y).toBeGreaterThanOrEqual(inputBox!.y + inputBox!.height);
    await shot(page, `training-v3-width-${width}`, info);
    expect(errors).toEqual([]);
  });

test("revision conflict reloads newer records, retains draft and safely retries", async ({
  page,
}) => {
  await seed(page);
  await enter(page);
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.revision++;
    state.waters.push({
      id: "other-tab-water",
      date: "2026-10-21",
      ml: 250,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(state));
  }, DATA_KEY);
  await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  await expect(page.locator(".workout-set-entry")).toContainText(
    "另一個分頁已更新資料",
  );
  await expect(page.locator('input[name="weight"]').first()).toHaveValue("65");
  expect((await stored(page)).sessions[1].exercises[0].sets).toHaveLength(0);
  await page.getByRole("button", { name: "完成這一組", exact: true }).click();
  await expect(page.locator(".set-history .session-set")).toHaveCount(1);
  expect((await stored(page)).waters[0].id).toBe("other-tab-water");
});

test("Training home: real Cycle day progress and muscle target totals are visible", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  const fixture: AppState=trainingFixture();
  fixture.cycles![0].muscleTargets=[
    {muscle:"Chest",target:8,frequency:1,priority:true,allocation:[0]},
  ];
  await seed(page,fixture);
  await page.goto("/training/");
  const overview=page.getByRole("region",{name:"本輪訓練進度"});
  await expect(overview).toBeVisible();
  await expect(overview).toContainText("第 1 輪");
  await expect(overview).toContainText("0 / 2");
  await expect(overview.getByRole("heading",{name:"Muscle Volume"})).toBeVisible();
  await expect(overview).toContainText("0 / 8");
  await expect(overview.getByRole("link",{name:/訓練成效/})).toHaveAttribute("href",/progress\/training/);
  await expect(overview.getByRole("link",{name:/週期檢視/})).toHaveAttribute("href",/progress\/weekly/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});

test("Training home: missing muscle targets are transparent, no invented volume", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await seed(page);
  await page.goto("/training/");
  const overview=page.getByRole("region",{name:"本輪訓練進度"});
  await expect(overview).toBeVisible();
  await expect(overview).toContainText("尚未設定肌群目標組數");
  await expect(overview.getByRole("heading",{name:"Muscle Volume"})).toHaveCount(0);
  await expect(overview).toContainText("已處理包含完成及明確略過");
});

// Training expansion regression tests use synthetic fixtures, never live user records.
test("performance engine: stable exercise ID, optional RIR, e1RM and weekly working volume", async () => {
  const {trainingProgressEvidence,weeklyWorkingVolume,estimatedOneRepMax,currentCycleWorkingVolume}=
    await import("../../src/lib/training-performance");
  const state:AppState=trainingFixture();
  const recent=state.sessions[1];
  recent.status="completed";recent.date="2026-10-23";recent.workoutDate="2026-10-23";
  recent.completedAt="2026-10-23T12:00:00.000Z";
  recent.exercises[0].muscle="Chest";
  recent.exercises[0].sets=[{...segment("new-working"),weight:61,rir:2},
    {...segment("rp-ignored"),type:"rp",weight:50,parentId:"new-working"}];
  const evidence=trainingProgressEvidence(state);
  expect(evidence).toHaveLength(1);
  expect(evidence[0].key).toBe("id:stable-a");
  expect(evidence[0].outcome).toBe("improved");
  expect(evidence[0].e1rmChangePercent).toBeGreaterThanOrEqual(1);
  expect(evidence[0].after.rir).toBe(2);
  expect(estimatedOneRepMax(60,13)).toBeNull();
  const week=weeklyWorkingVolume(state,"2026-10-23");
  expect(week.totalWorkingSets).toBe(2);
  expect(week.unassigned).toBe(1);
  expect(currentCycleWorkingVolume(state,"test-cycle").workingSets).toBe(1);
  recent.exercises[0].exerciseLibraryId="some-other-stable-id";
  expect(trainingProgressEvidence(state)).toHaveLength(0);
});
test("safety engine: high-severity pain overrides performance-based changes", async () => {
  const {trainingSafetyReview}=await import("../../src/lib/training-review-evidence");
  const state:AppState=trainingFixture();
  expect(trainingSafetyReview(state,"2026-10-23").status).toBe("insufficient");
  state.recoveryEntries=[{id:"pain-safety",date:"2026-10-23",type:"pain",value:7,
    area:"肩膀",side:"Left",flags:["worsening"],createdAt:"2026-10-23T08:00:00Z"}];
  const review=trainingSafetyReview(state,"2026-10-23");
  expect(review.status).toBe("safety-first");
  expect(review.painDescription).toContain("停止");
  expect(state.cycles![0].stage).toBeUndefined();
});
test("settings: Training preferences remain separate from editable Training Plan",async({page})=>{
  await seed(page);
  await page.goto("/settings/training/");
  await expect(page.getByRole("link",{name:/編輯訓練課表/})).toHaveAttribute("href",/training\/plan/);
  await expect(page.locator('input[name="showRir"]')).toBeChecked();
  await page.locator('input[name="showRir"]').uncheck();
  await page.getByRole("button",{name:"儲存設定"}).click();
  await expect.poll(async()=>(await stored(page)).preferences?.showRir).toBe(false);
  await page.goto("/training/session/");
  await expect(page.locator('input[name="rir"]')).toHaveCount(0);
});
test("calendar: seven-day Batch saves without rewriting completed sessions",async({page})=>{
  await seed(page);
  const before=await stored(page);
  await page.goto("/training/calendar/");
  await page.locator(".training-batch-planning summary").click();
  await expect(page.getByRole("button",{name:"儲存七天排程"})).toBeVisible();
  page.on("dialog",dialog=>void dialog.accept());
  await page.getByRole("button",{name:"儲存七天排程"}).click();
  await expect.poll(async()=>((await stored(page)).schedule??[]).filter(x=>x.source==="batch").length).toBe(7);
  const after=await stored(page);
  expect(after.sessions).toEqual(before.sessions);
  expect(after.cycles).toEqual(before.cycles);
});
test("Cardio: optional distance, heart rate and source persist without nutrition credit",async({page})=>{
  await seed(page);
  await page.goto("/training/activity/");
  await expect(page.getByRole("heading",{name:"Cardio"})).toBeVisible();
  await page.locator('input[name="minutes"]').fill("35");
  await page.locator('input[name="distanceKm"]').fill("4.25");
  await page.locator('input[name="avgHeartRate"]').fill("128");
  await page.locator('input[name="calories"]').fill("210");
  await page.locator('select[name="caloriesSource"]').selectOption("machine");
  await page.getByRole("button",{name:"保存紀錄"}).click();
  await expect.poll(async()=>(await stored(page)).cardio.length).toBe(1);
  const saved=(await stored(page)).cardio[0];
  expect(saved.distanceKm).toBe(4.25);
  expect(saved.avgHeartRate).toBe(128);
  expect(saved.caloriesSource).toBe("machine");
  await expect(page.getByText(/不加回可吃熱量/)).toBeVisible();
});

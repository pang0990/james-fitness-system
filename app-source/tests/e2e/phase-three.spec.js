import { test } from "@playwright/test";
import { REVIEW_STORAGE_KEY } from "../../src/lib/review-preview";

test.skip(
  process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW !== "1",
  "Isolated review build only",
);

async function read(page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    REVIEW_STORAGE_KEY,
  );
}
function equal(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error(message);
}
test("resume an overnight extra session without advancing the cycle", async ({
  page,
}) => {
  await page.goto("/training/");
  await page.getByRole("button", { name: /新增一場訓練/ }).click();
  const before = await read(page);
  await page.getByLabel("訓練名稱").fill("額外場 QA");
  await page.getByLabel("動作來源").selectOption("0");
  await page.getByRole("button", { name: "開始額外訓練" }).click();
  const warmup = page.getByRole("button", {name:"略過暖身"});
  await warmup.or(page.locator(".workout-set-entry")).first().waitFor();
  if(await warmup.isVisible()) await warmup.click();
  await page.locator(".workout-set-entry").waitFor();
  const id = (await read(page)).sessions.at(-1).id;
  await page.evaluate(
    ({ key, id }) => {
      const state = JSON.parse(localStorage.getItem(key));
      const session = state.sessions.find((s) => s.id === id);
      const d = new Date(session.createdAt);
      d.setUTCDate(d.getUTCDate() - 1);
      session.createdAt = d.toISOString();
      session.workoutDate = session.date = session.createdAt.slice(0, 10);
      localStorage.setItem(key, JSON.stringify(state));
    },
    { key: REVIEW_STORAGE_KEY, id },
  );
  await page.goto("/today/");
  await page.getByRole("link", { name: /繼續訓練/ }).click();
  await page.locator(".workout-set-entry").waitFor();
  equal(
    (await read(page)).sessions.at(-1).id,
    id,
    "resumed a different session",
  );
  await page.getByRole("button", { name: "訓練回顧" }).click();
  await page.getByRole("button", { name: "完成訓練", exact: true }).click();
  await page.getByRole("heading", { name: "訓練完成" }).waitFor();
  const after = await read(page);
  equal(
    after.sessions.length,
    before.sessions.length + 1,
    "duplicated session",
  );
  equal(after.sessions.at(-1).isExtra, true, "lost extra status");
  equal(after.cycles, before.cycles, "advanced cycle");
  equal(after.cycleEvents, before.cycleEvents, "created cycle event");
});
test("drag an exercise, review and save its new position", async ({ page }) => {
  await page.goto("/training/plan/");
  await page.getByRole("button", { name: /Day 1 ·/ }).click();
  const before = await read(page);
  const rows = page.locator(".plan-exercise");
  const previous = await rows.nth(1).locator("h4").innerText();
  await rows.nth(1).locator("[draggable=true]").dragTo(rows.first());
  equal(
    (await rows.first().locator("h4").innerText()).replace(/^\d+\. /, ""),
    previous.replace(/^\d+\. /, ""),
    "drag did not reorder rows",
  );
  await page.getByRole("button", { name: "檢閱變更" }).click();
  await page.getByRole("button", { name: "確認建立新版本" }).click();
  await page.waitForURL("**/training/");
  const after = await read(page);
  equal(
    after.cycles.at(-1).days[0].exercises[0],
    before.cycles.at(-1).days[0].exercises[1],
    "wrong saved exercise",
  );
  equal(after.sessions, before.sessions, "changed session snapshot");
});
test("calendar reschedule preserves cycle, sessions and nutrition", async ({
  page,
}) => {
  await page.goto("/today/");
  await page.getByTestId("today-v3").waitFor();
  const before = await read(page),
    date = before.meals[0].date;
  for (const label of ["休息日", "今天改練 下肢訓練"]) {
    await page.goto("/training/calendar/?date=" + date);
    await page.getByRole("dialog").waitFor();
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
  const after = await read(page);
  equal(
    after.schedule.at(-1).trainingDayId,
    before.cycles.at(-1).days[1].id,
    "wrong day reference",
  );
  equal(after.schedule.at(-1).date, date, "wrong day");
  for (const field of ["sessions", "cycles", "meals", "dayTypes"])
    equal(after[field], before[field], "changed " + field);
  await page.goto("/today/");
  await page.getByRole("heading", { name: "下肢訓練" }).waitFor();
});
test("save two different food portions as one batch", async ({ page }) => {
  await page.goto("/today/");
  await page.getByRole("button", { name: "加入飲食" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "午餐", exact: true })
    .click();
  const before = await read(page);
  for (const [i, [name, grams]] of [
    ["白飯", "120"],
    ["雞胸", "85"],
  ].entries()) {
    if (i) await page.getByRole("button", { name: /繼續新增/ }).click();
    await page.getByLabel("搜尋食物").fill(name);
    await page.locator("button.food-result-select").first().click();
    await page.getByLabel("食用重量", { exact: true }).fill(grams);
    await page.getByRole("button", { name: "加入待確認清單" }).click();
    equal(
      (await read(page)).meals.length,
      before.meals.length,
      "partial batch write",
    );
  }
  await page.getByRole("button", { name: "確認加入 2 項食物" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const meals = (await read(page)).meals.slice(before.meals.length);
  equal(
    meals.map((m) => m.quantity),
    [120, 85],
    "wrong batch quantities",
  );
  equal(
    meals.map((m) => m.slot),
    ["午餐", "午餐"],
    "wrong meal slot",
  );
  equal(new Set(meals.map((m) => m.id)).size, 2, "duplicate ID");
});

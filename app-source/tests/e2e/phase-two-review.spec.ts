import { test, expect } from "@playwright/test";
import { REVIEW_STORAGE_KEY } from "../../src/lib/review-preview";
test.skip(
  process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW !== "1",
  "Requires isolated review build",
);
test("workout queue, timer, draft and finish review", async ({ page }) => {
  const ok = [];
  const go = async (route: string) => {
    await page.goto("/" + route + "/");
    await page.getByTestId("jfs-review-banner").waitFor();
  };
  const key = REVIEW_STORAGE_KEY;
  const read = () =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await go("training");
    await page
      .getByRole("button", { name: /開始訓練/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: "略過暖身" })
      .click({ timeout: 4500 })
      .catch(() => {});
    await go("today");
    await page.getByRole("link", { name: /繼續訓練/ }).click();
    await page.locator(".workout-set-entry").waitFor();
    ok.push("Today resume");
    const field = (n: string) =>
      page.locator(".workout-set-entry input[name=" + n + "]");
    await field("weight").fill("50");
    await field("reps").fill("9");
    await field("rir").fill("2");
    await page.locator(".exercise-queue button").nth(1).click();
    await expect(
      page.getByRole("heading", { name: "Barbell Row", exact: true }),
    ).toBeVisible();
    if ((await field("weight").inputValue()) !== "")
      throw Error("cross exercise");
    await field("weight").fill("22");
    await page.locator(".exercise-queue button").first().click();
    if ((await field("reps").inputValue()) !== "9") throw Error("draft lost");
    ok.push("queue + independent draft");
    await page.getByRole("button", { name: "完成這一組", exact: true }).click();
    if (
      (await field("weight").inputValue()) !== "50" ||
      (await field("reps").inputValue()) !== "" ||
      (await field("rir").inputValue()) !== ""
    )
      throw Error("prefill");
    ok.push("only weight prefilled");
    let active = (await read()).sessions.at(-1);
    let start = active.restStartedAt;
    await page.getByRole("button", { name: "+15 秒", exact: true }).click();
    await page.getByRole("button", { name: "+30 秒", exact: true }).click();
    await page.locator(".exercise-queue button").nth(1).click();
    if ((await read()).sessions.at(-1).restStartedAt !== start)
      throw Error("timer changed");
    ok.push("rest extensions and switching");
    await page.getByRole("button", { name: "暫停訓練", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "繼續訓練", exact: true }).click();
    ok.push("pause reload resume");
    await page.getByRole("button", { name: "訓練回顧", exact: true }).click();
    await page.getByRole("radio", { name: /只保存本次/ }).check();
    await page.getByRole("button", { name: "完成訓練", exact: true }).click();
    await page.getByRole("heading", { name: "訓練完成" }).waitFor();
    let done = (await read()).sessions.at(-1);
    if (
      done.cycleCounted !== false ||
      done.exercises[0].sets.length !== 1 ||
      !Object.values(done.setDrafts as Record<string, { weight: string }>).some(
        (d) => d.weight === "22",
      )
    )
      throw Error("finish integrity");
    ok.push("keep cycle + save summary + retain draft");
    expect(ok).toContain("keep cycle + save summary + retain draft");
  } catch (e) {
    throw e;
  }
});
test("food retry, recent portion, batch and dated journal", async ({
  page,
}) => {
  let passed = [];
  let key = REVIEW_STORAGE_KEY;
  const read = () =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
  try {
    await page.goto("/today/");
    let b = (name: string) => page.getByRole("button", { name, exact: true });
    await b("加入飲食").click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "午餐", exact: true })
      .click();
    await page.getByLabel("搜尋食物").fill("白飯");
    await page.locator("button.food-result-select").first().click();
    const grams = page.getByLabel("食用重量", { exact: true });
    let base = await grams.inputValue();
    await grams.fill("137");
    await page.locator(".logger-favorite").click();
    let before = (await read()).meals.length;
    await page.evaluate((k) => {
      let original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === k) {
          Storage.prototype.setItem = original;
          throw Error("QA simulated write failure");
        }
        return original.call(this, key, value);
      };
    }, key);
    await b("儲存至午餐").click();
    if (
      (await grams.inputValue()) !== "137" ||
      (await read()).meals.length !== before
    )
      throw Error("lost failed portion");
    passed.push("failed direct save retains grams");
    await b("儲存至午餐")
      .dblclick({ timeout: 3000 })
      .catch(() => {});
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    let row = (await read()).meals.at(-1);
    if (
      (await read()).meals.length !== before + 1 ||
      row.quantity !== 137 ||
      row.slot !== "午餐"
    )
      throw Error("duplicate or wrong meal");
    passed.push("direct retry exactly once, back to Today");
    await b("加入飲食").click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "午餐", exact: true })
      .click();
    await page
      .locator(".logger-shortcuts")
      .first()
      .getByRole("button")
      .first()
      .click();
    if ((await grams.inputValue()) !== "137") throw Error("recent portion");
    await b("← 返回").click();
    await page.getByLabel("搜尋食物").fill("白飯");
    await page.locator("button.food-result-select").first().click();
    if ((await grams.inputValue()) !== base) throw Error("base portion");
    passed.push("recent vs search portions");
    await b("加入待確認清單").click();
    await b("確認加入 1 項食物").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    passed.push("batch save");
    await page.goto("/nutrition/");
    await b("前一天").click();
    await page.locator(".journal-health button").first().click();
    let legend = await page.getByRole("dialog").innerText();
    let date = legend.match(/\d{4}-\d{2}-\d{2}/)![0];
    await page.getByLabel("飲水量 mL").fill("315");
    await b("儲存").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    if ((await read()).waters.at(-1).date !== date) throw Error("wrong date");
    passed.push("Journal selected-day water");
    expect(passed).toContain("Journal selected-day water");
  } catch (e) {
    throw e;
  }
});
test("plan review, stable IDs and new version", async ({ page }) => {
  await page.goto("/training/plan/");
  let key = REVIEW_STORAGE_KEY;
  const read = () =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
  await page.getByRole("button", { name: /Day 1 ·/ }).click();
  let old = await read();
  await page.getByLabel("訓練日 1", { exact: true }).fill("QA 上肢");
  await page.getByRole("button", { name: "檢閱變更", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByText("Day 1 · QA 上肢", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "確認建立新版本" }).click();
  await page.waitForURL("**/training/");
  let next = await read();
  if (
    next.cycles.at(-1).previousId !== old.cycles.at(-1).id ||
    JSON.stringify(next.sessions) !== JSON.stringify(old.sessions)
  )
    throw Error("plan snapshot mismatch");
  expect(next.cycles.length).toBe(old.cycles.length + 1);
});

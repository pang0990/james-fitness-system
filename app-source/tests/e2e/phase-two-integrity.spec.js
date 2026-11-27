import { test } from "@playwright/test";
import { REVIEW_STORAGE_KEY } from "../../src/lib/review-preview";
test.skip(
  process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW !== "1",
  "Requires isolated review build",
);
test("set retries, child rows and rest-pause timer", async ({ page: p }) => {
  await p.setViewportSize({ width: 375, height: 667 });
  let key = REVIEW_STORAGE_KEY,
    read = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  let b = (n) => p.getByRole("button", { name: n, exact: true });
  await p.goto("/training/");
  await b("開始訓練").click();
  await b("略過暖身")
    .click({ timeout: 2000 })
    .catch(() => {});
  let form = p.locator(".workout-set-entry");
  let nr = (n) => form.locator("input[name=" + n + "]");
  let fill = async (type, kg, reps) => {
    await form.getByLabel("組型").selectOption(type);
    if (["rp", "drop"].includes(type))
      await form.getByLabel("所屬工作組").selectOption({ index: 1 });
    await nr("weight").fill(kg);
    await nr("reps").fill(reps);
    await b("完成這一組").click();
  };
  await fill("warmup", "12", "8");
  await fill("rampup", "18", "5");
  await nr("weight").fill("45");
  await nr("reps").fill("8");
  await p.evaluate((k) => {
    let orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, v) {
      if (k === key) {
        Storage.prototype.setItem = orig;
        throw Error("QA quota");
      }
      return orig.call(this, key, v);
    };
  }, key);
  await b("完成這一組").click();
  await form
    .getByText(/保存失敗/)
    .first()
    .waitFor();
  if (
    (await nr("weight").inputValue()) !== "45" ||
    (await nr("reps").inputValue()) !== "8"
  )
    throw Error("failed draft lost");
  await b("重試保存草稿").click();
  await form.evaluate((f) => {
    f.requestSubmit();
    f.requestSubmit();
  });
  let session = (await read()).sessions.at(-1);
  if (session.exercises[0].sets.length !== 3) throw Error("duplicate submit");
  await p.getByText("動作設定", { exact: true }).click();
  await p.getByRole("checkbox", { name: "Rest-Pause" }).check();
  await fill("drop", "32", "6");
  await fill("rp", "45", "3");
  if (
    (await nr("weight").inputValue()) !== "45" ||
    (await nr("reps").inputValue()) !== ""
  )
    throw Error("child prefill");
  let sets = (await read()).sessions.at(-1).exercises[0].sets;
  if (sets[3].parentId !== sets[2].id || sets[4].parentId !== sets[2].id)
    throw Error("parent mismatch");
  let parent = p.locator(".set-group").nth(2).locator(".session-set").first();
  await parent.getByRole("button", { name: "編輯" }).click();
  await p.getByRole("dialog").locator("[name=weight]").fill("46");
  await b("儲存修改").click();
  await b("撤銷編輯").click();
  p.once("dialog", (d) => d.accept());
  await parent.getByRole("button", { name: "刪除" }).click();
  if ((await read()).sessions.at(-1).exercises[0].sets.length !== 2)
    throw Error("cascade delete");
  await b("復原").click();
  if (
    JSON.stringify((await read()).sessions.at(-1).exercises[0].sets) !==
    JSON.stringify(sets)
  )
    throw Error("undo mismatch");
  await b("開始 RP 短休息").click();
  await p
    .locator(".rp-short-rest")
    .getByRole("button", { name: "+15 秒" })
    .click();
  if (!(await read()).sessions.at(-1).rpRestStartedAt)
    throw Error("no RP timer");
  await b("結束 RP 短休息").click();
});
test("dated health entries and keyboard focus", async ({ page: p }) => {
  await p.setViewportSize({ width: 1440, height: 900 });
  let key = REVIEW_STORAGE_KEY,
    b = (n) => p.getByRole("button", { name: n, exact: true });
  await p.goto("/nutrition/");
  await b("前一天").click();
  await b("紀錄體重").click();
  let dialog = p.getByRole("dialog");
  let date = (await dialog.innerText()).match(/\d{4}-\d{2}-\d{2}/)[0];
  await p.getByLabel("本次體重 kg").fill("77.4");
  await b("儲存並關閉").click();
  await dialog.waitFor({ state: "hidden" });
  await b("紀錄恢復狀態").click();
  await p.getByRole("radio", { name: "4", exact: true }).check();
  await b("儲存並關閉").click();
  await dialog.waitFor({ state: "hidden" });
  let s = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  if (
    s.measurements.at(-1).date !== date ||
    s.recoveryEntries.at(-1).date !== date
  )
    throw Error("date mismatch");
  await b("紀錄體重").focus();
  await p.keyboard.press("Enter");
  await dialog.waitFor();
  await p.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  if (!(await b("紀錄體重").evaluate((el) => el === document.activeElement)))
    throw Error("focus not restored");
});
test("second session retains its identity in history", async ({ page: p }) => {
  await p.setViewportSize({ width: 375, height: 667 });
  let k = REVIEW_STORAGE_KEY;
  await p.goto("/today/");
  await p.getByTestId("today-v3").waitFor();
  await p.evaluate((k) => {
    let s = JSON.parse(localStorage.getItem(k)),
      d = s.meals[0].date;
    Object.assign(s.sessions[0], {
      date: d,
      isExtra: false,
      cycleId: s.cycles[0].id,
      trainingDayId: s.cycles[0].days[0].id,
      cycleCounted: true,
    });
    s.cycles[0].days[0].secondSession = {
      name: "QA 第二場",
      exercises: s.cycles[0].days[0].exercises.slice(0, 1),
    };
    localStorage.setItem(k, JSON.stringify(s));
  }, k);
  await p.reload();
  await p.getByRole("link", { name: "開始第二場" }).click();
  await p.locator("#planned-second").click();
  await p
    .getByRole("button", { name: "略過暖身" })
    .click({ timeout: 2000 })
    .catch(() => {});
  await p.getByRole("button", { name: "訓練回顧" }).click();
  await p.getByRole("button", { name: "完成訓練", exact: true }).click();
  await p.getByRole("heading", { name: "訓練完成", exact: true }).waitFor();
  await p.goto("/training/history/");
  await p.locator("summary").filter({ hasText: "QA 第二場" }).click();
  let s = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), k);
  if (
    s.sessions.length !== 3 ||
    s.sessions.at(-1).parentSessionId !== s.sessions[0].id ||
    s.cycleEvents.length !== 0
  )
    throw Error("second session integrity");
  await p
    .getByRole("link", { name: /查看單次訓練詳情/ })
    .filter({ visible: true })
    .first()
    .click();
  await p.getByRole("heading", { name: "QA 第二場" }).waitFor();
});

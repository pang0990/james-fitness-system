import { test, expect } from "@playwright/test";
import { initialState, dateInZone, addDays } from "../../src/lib/domain";
const key = "james-fitness-user-v1:jfs-local-guest-v1";
const today = dateInZone();
test.beforeEach(async ({ page }) => {
  const s = initialState();
  s.appearance = {
    theme: "dark",
    visualStyle: "minimal",
    showCompanion: false,
  };
  s.foods = [
    {
      id: "qa-rice",
      name: "驗收米飯",
      category: "碳水",
      base: 100,
      unit: "g",
      p: 2,
      c: 30,
      f: 1,
      kcal: 137,
      source: "isolated test",
      version: 3,
    },
    {
      id: "qa-chicken",
      name: "驗收雞肉",
      category: "蛋白質",
      base: 100,
      unit: "g",
      p: 25,
      c: 0,
      f: 2,
      kcal: 118,
      source: "isolated test",
      version: 2,
    },
  ];
  s.meals = [
    {
      id: "yesterday",
      date: addDays(today, -1),
      slot: s.mealSlots[0],
      name: "昨日快照",
      quantity: 2,
      unit: "份",
      foodId: "retired-food",
      foodVersion: 7,
      p: 20,
      c: 40,
      f: 10,
      kcal: 330,
      createdAt: new Date().toISOString(),
    },
  ];
  await page.addInitScript(
    ({ key, s }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(s));
        localStorage.setItem("jfs-guest-mode-v1", "active");
      }
    },
    { key, s },
  );
  await page.route("https://*.supabase.co/**", (r) => r.abort());
  await page.goto("/nutrition/");
  await expect(page.getByTestId("nutrition-v3b")).toBeVisible();
});
async function open(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: /新增食物至/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function addFood(page: import("@playwright/test").Page, name: string, grams = "100") {
  const dialog = page.getByRole("dialog");
  const backToSearch = dialog.getByRole("button", {name:/繼續新增/});
  if (await backToSearch.count()) await backToSearch.click();
  await dialog.getByLabel("搜尋食物").fill(name);
  await dialog.locator(".food-list li > button").first().click();
  await expect(dialog.getByLabel("食用重量")).toBeVisible();
  await dialog.getByLabel("食用重量").fill(grams);
  await dialog.getByRole("button", {name:"加入待確認清單"}).click();
  await expect(dialog.getByRole("heading", {name:/待確認清單/})).toBeVisible();
}
async function stored(page: import("@playwright/test").Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
}
test("multi-add, source-unit conversion, saved meal and no duplicate writes", async ({
  page,
}) => {
  await open(page);
  await addFood(page, "驗收米飯", "150");
  await addFood(page, "驗收雞肉");
  await expect(page.locator(".food-plate-confirm")).toContainText("324 kcal");
  await page.getByText("另存為常吃套餐（選填）").click();
  await page.getByLabel("套餐名稱").fill("測試套餐");
  await page.getByRole("button", { name: "儲存清單為套餐" }).click();
  const before = await stored(page);
  expect(before.meals).toHaveLength(1);
  expect(before.savedMeals[0].items[0].quantity).toBe(150);
  await page.getByRole("button", { name: "確認加入 2 項食物" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const after = await stored(page);
  expect(after.meals).toHaveLength(3);
  expect(after.meals[1].kcal).toBe(205.5);
  expect(after.meals[1].foodVersion).toBe(3);
  await page.reload();
  expect((await stored(page)).meals).toHaveLength(3);
  await open(page);
  await page.getByRole("button", { name: "常吃套餐", exact: true }).click();
  await page.getByRole("button", { name: "加入套餐" }).click();
  await expect(
    page.getByRole("button", { name: "確認加入 2 項食物" }),
  ).toBeEnabled();
});
test("copy snapshot, remove selection, choose destination, weekly navigation", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: /複製餐點至/ })
    .first()
    .click();
  await page.getByRole("button", { name: "選取整餐至清單" }).click();
  await page.getByRole("button", {name:/昨日快照/}).click();
  await page.getByLabel("食用重量").fill("1");
  await page.getByRole("button", {name:"更新份量"}).click();
  await page.getByRole("button", {name:/2026-.*早餐/}).click();
  await page.getByLabel("加入哪一餐", {exact:true}).selectOption("午餐");
  await page.getByRole("button", { name: "確認加入 1 項食物" }).click();
  const s = await stored(page);
  expect(s.meals[1]).toMatchObject({
    kcal: 165,
    foodVersion: 7,
    slot: "午餐",
    date: today,
  });
  expect(s.meals[1].supersedes).toBeUndefined();
  expect(s.meals[0].kcal).toBe(330);
  await page
    .getByRole("button", { name: new RegExp(addDays(today, -1) + " 有紀錄") })
    .click();
  await expect(page.locator(".meal-list")).toContainText("昨日快照");
});
test("failed write retains plate, offline retry saves once; escape cannot discard silently", async ({
  page,
  context,
}) => {
  await open(page);
  await addFood(page, "驗收米飯");
  page.once("dialog", (d) => d.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k.startsWith("james-fitness-user-v1:")) {
        Storage.prototype.setItem = original;
        throw Error("test quota failure");
      }
      return original.call(this, k, v);
    };
  });
  await page.getByRole("button", { name: "確認加入 1 項食物" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "儲存失敗" }),
  ).toBeVisible();
  expect((await stored(page)).meals).toHaveLength(1);
  await context.setOffline(true);
  await page.getByRole("button", { name: "確認加入 1 項食物" }).click();
  expect((await stored(page)).meals).toHaveLength(2);
});
for (const width of [390, 1440])
  test(`logger responsive ${width}: Quick Macro, clear text, no overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
    await open(page);
    await page
      .getByRole("button", { name: "Quick Macro", exact: true })
      .click();
    await page.getByLabel("這餐吃了什麼", { exact: true }).fill("驗收手動輸入");
    for (const [k, v] of [
      ["蛋白質 g", "20"],
      ["碳水 g", "30"],
      ["脂肪 g", "10"],
    ])
      await page.getByLabel(k, { exact: true }).fill(v);
    await page.getByRole("button", { name: "加入 Quick Macro 至清單" }).click();
    await expect(page.locator(".food-plate-confirm")).toContainText("290 kcal");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const dialog = page.getByRole("dialog");
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await expect.poll(()=>page.getByRole("button",{name:"確認加入 1 項食物"}).evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}))).toEqual({color:"rgb(10, 10, 10)",background:"rgb(245, 245, 245)"});
    if (process.env.NUTRITION_QA_DIR)
      await page.screenshot({
        path: process.env.NUTRITION_QA_DIR + `/nutrition-logger-${width}.png`,
      });
    await page.getByRole("button", { name: "確認加入 1 項食物" }).click();
    await expect(page.getByTestId("nutrition-v3b")).toContainText("290");
    expect(errors).toEqual([]);
  });

test("B2 expands several meals independently, and logger keeps a compact search-first flow", async ({page}) => {
  const rows = page.locator(".meal-section--b2");
  await expect(rows).toHaveCount(4);
  await rows.nth(0).locator(".meal-toggle").click();
  await rows.nth(1).locator(".meal-toggle").click();
  await expect(rows.nth(0).locator(".meal-details")).toBeVisible();
  await expect(rows.nth(1).locator(".meal-details")).toBeVisible();
  await rows.nth(1).locator(".meal-toggle").click();
  await expect(rows.nth(0).locator(".meal-details")).toBeVisible();
  await expect(rows.nth(1).locator(".meal-details")).toHaveCount(0);
  await open(page);
  await expect(page.getByRole("dialog").getByLabel("搜尋食物")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("50 g")).toHaveCount(0);
  await addFood(page, "驗收米飯", "175");
  await expect(page.locator(".logger-plate-item")).toContainText("175 g");
});


test("recorded meal can be resized and removed without rewriting earlier snapshots", async ({page}) => {
  await open(page);
  await addFood(page, "驗收雞肉", "100");
  await page.getByRole("button", {name:"確認加入 1 項食物"}).click();
  const breakfast = page.locator(".meal-section--b2").first();
  await breakfast.locator(".meal-toggle").click();
  await breakfast.locator(".meal-entry-menu summary").click();
  await breakfast.getByRole("button", {name:"編輯／移動餐次"}).click();
  await page.getByLabel("修改食用重量").fill("150");
  await page.getByRole("button", {name:"保存修正"}).click();
  const rows = (await stored(page)).meals;
  expect(rows).toHaveLength(3);
  expect(rows[1].kcal).toBe(118);
  expect(rows[2]).toMatchObject({
    supersedes:rows[1].id,quantity:150,unit:"g",foodId:"qa-chicken",kcal:177,
  });
  await breakfast.locator(".meal-entry-menu summary").click();
  page.once("dialog",dialog=>dialog.accept());
  await breakfast.getByRole("button", {name:"刪除此筆紀錄"}).click();
  await expect(breakfast).toContainText("尚未記錄");
  const after=(await stored(page)).meals;
  expect(after).toHaveLength(4);
  expect(after[3]).toMatchObject({supersedes:after[2].id,deleted:true});
});

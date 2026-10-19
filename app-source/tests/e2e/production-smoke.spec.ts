import { test, expect, DATA_KEY } from "./authenticated";

/**
 * Authenticated local-data browser smoke test.
 * Uses a synthetic cached identity; this cannot verify Google OAuth or RLS.
 */
test("mobile: four primary workspaces render with usable navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [route, selector] of [
    ["today", ".today-reference-page"],
    ["nutrition", ".daily-page"],
    ["training", ".training-home"],
    ["progress", ".daily-page"],
  ]) {
    await page.goto(`/${route}/`);
    await expect(page.locator(selector).first()).toBeVisible();
    await expect(page.locator(".bottom-nav")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, route + " must not overflow viewport").toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test("desktop: primary app workspaces and account-scoped data load", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/today/");
  await expect(page.locator(".today-reference-page")).toBeVisible();
  await expect(page.locator(".sidebar")).toBeVisible();
  const state = await page.evaluate(key => localStorage.getItem(key), DATA_KEY);
  expect(state).not.toBeNull();
  for (const path of ["nutrition", "training", "progress"]) {
    await page.goto(`/${path}/`);
    await expect(page.locator(".main")).toBeVisible();
    await expect(page.locator(".sidebar")).toBeVisible();
  }
});

test("mobile: adding water persists in the scoped account across reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  await expect(page.locator(".today-reference-page")).toBeVisible();
  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  await expect.poll(() => page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    return (state.waters || []).reduce((sum: number, row: { ml: number }) => sum + row.ml, 0);
  }, DATA_KEY)).toBe(250);
  await page.reload();
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}"), DATA_KEY);
  expect(stored.waters).toHaveLength(1);
  expect(stored.waters[0].ml).toBe(250);
});

test("backup: invalid JSON is rejected without changing account records", async ({ page }) => {
  await page.goto("/settings/data/");
  await expect(page.getByLabel("匯入 JSON 備份")).toBeVisible();
  const before = await page.evaluate(key => localStorage.getItem(key), DATA_KEY);
  await page.getByLabel("匯入 JSON 備份").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByRole("alert")).toContainText("備份格式無效");
  const after = await page.evaluate(key => localStorage.getItem(key), DATA_KEY);
  expect(after).toEqual(before);
});

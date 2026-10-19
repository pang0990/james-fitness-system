import { test, expect } from "@playwright/test";
import { initialState } from "../../src/lib/domain";

/**
 * Offline UI smoke only. A cached mock session is NOT an OAuth or RLS test.
 * Real Google login and Supabase DB permissions require separate integration QA.
 */
test("mock signed-in user can view four workspaces and persist water locally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const id = "00000000-0000-4000-8000-000000000019";
  const storageKey = `james-fitness-user-v1:${id}`;
  const s = initialState();
  s.profile = {
    name: "Fixture",
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
  const session = {
    access_token: "test-only-header.test-only-payload.test-only-signature",
    refresh_token: "test-only-refresh",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: {
      id,
      aud: "authenticated",
      role: "authenticated",
      email: "playwright-fixture@example.invalid",
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
  await page.addInitScript(({ session, state, storageKey }) => {
    if (!localStorage.getItem("jfs-google-session-v1"))
      localStorage.setItem("jfs-google-session-v1", JSON.stringify(session));
    if (!localStorage.getItem(storageKey))
      localStorage.setItem(storageKey, JSON.stringify(state));
  }, { session, state: s, storageKey });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const today = await page.goto("/today/");
  expect(today?.status()).toBe(200);
  await expect(page.locator(".today-reference-page")).toBeVisible();
  await expect(page.locator(".bottom-nav a")).toHaveCount(4);
  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  await expect.poll(async () => page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key) || "null");
    return data?.waters?.some((w: { ml: number }) => w.ml === 250) ?? false;
  }, storageKey)).toBe(true);
  await page.reload();
  await expect(page.locator(".today-reference-page")).toBeVisible();
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "null"), storageKey);
  expect(restored.waters.some((w: { ml: number }) => w.ml === 250)).toBe(true);

  for (const [route, selector] of [
    ["/nutrition/", ".daily-page"],
    ["/training/", ".daily-page"],
    ["/progress/", ".daily-page"],
  ] as const) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator(selector).first()).toBeVisible();
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth > innerWidth + 1), route).toBe(false);
  }
  expect(errors).toEqual([]);
});

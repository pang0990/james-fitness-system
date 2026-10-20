import { expect, test } from "./authenticated";

test("Glass Lab: compare smoked, clear and opaque materials with real backdrop blur", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ui-showcase/");
  const stage = page.getByTestId("ui-showcase");
  await expect(stage).toHaveAttribute("data-material", "smoked");
  const smoked = await stage.locator(".jfs-ui-surface--card").first().evaluate((el) => {
    const css = getComputedStyle(el);
    return { bg: css.backgroundColor, blur: css.backdropFilter };
  });
  expect(smoked.bg).toMatch(/rgba?\(/);
  expect(smoked.blur).toContain("blur(");
  await page.screenshot({ path: "test-results/glass-v4-smoked-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "霧白玻璃" }).click();
  await expect(stage).toHaveAttribute("data-material", "clear");
  await expect(page.getByRole("button", { name: "霧白玻璃" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/glass-v4-clear-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "原本霧面" }).click();
  await expect(stage).toHaveAttribute("data-material", "solid");
  expect(await stage.locator(".jfs-ui-surface--card").first().evaluate((el) =>
    getComputedStyle(el).backdropFilter)).toBe("none");
});

test("Glass Lab: small screen remains usable with a smoked material backdrop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ui-showcase/");
  await expect(page.getByTestId("ui-showcase")).toHaveAttribute("data-material", "smoked");
  await expect(page.getByRole("button", { name: "深色玻璃" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/glass-v4-smoked-mobile.png", fullPage: true });
});

for (const route of ["today", "nutrition", "training", "progress"] as const) {
  test(`Glass app: ${route} gets a frosted shell with no overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/" + route + "/");
    const app = page.locator(".app.jfs3-shell");
    await expect(app).toBeVisible();
    const backdrop = await page.locator(".topbar").evaluate(el => getComputedStyle(el).backdropFilter);
    expect(backdrop).toContain("blur(");
    const keySurface = route === "today" ? ".today-v3-focus" :
      route === "nutrition" ? ".nutrition-v3b" :
      route === "training" ? ".training-today" : ".direction-hero";
    await expect(page.locator(keySurface).first()).toBeVisible();
    const material = await page.locator(keySurface).first().evaluate(el => ({
      blur: getComputedStyle(el).backdropFilter,
      bg: getComputedStyle(el).backgroundColor,
    }));
    expect(material.blur).toContain("blur(");
    expect(material.bg).toMatch(/rgba?\(/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (route === "today") await page.screenshot({ path: "test-results/glass-v4-today-mobile.png", fullPage: true });
    if (route === "nutrition") await page.screenshot({ path: "test-results/glass-v4-nutrition-mobile.png", fullPage: true });
  });
}

test("Reduce Transparency makes glass surfaces opaque and disables backdrop blur", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  const surface = page.locator(".today-v3-focus");
  await expect(surface).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.reduceTransparency = "true";
  });
  const after = await surface.evaluate(el => ({
    blur: getComputedStyle(el).backdropFilter,
    background: getComputedStyle(el).backgroundColor,
  }));
  expect(after.blur).toBe("none");
  expect(after.background).toMatch(/rgb\(/);
});

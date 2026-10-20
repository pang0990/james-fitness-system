import { expect, test } from "./authenticated";

test("Glass Lab: compare white crystal, lighter and opaque materials with real backdrop blur", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ui-showcase/");
  const stage = page.getByTestId("ui-showcase");
  await expect(stage).toHaveAttribute("data-material", "crystal");
  const crystal = await stage.locator(".jfs-ui-surface--card").first().evaluate((el) => {
    const css = getComputedStyle(el);
    return { bg: css.backgroundColor, blur: css.backdropFilter };
  });
  expect(crystal.bg).toMatch(/rgba?\(/);
  expect(crystal.blur).toContain("blur(");
  await page.screenshot({ path: "test-results/glass-v5-white-crystal-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "高透白玻璃" }).click();
  await expect(stage).toHaveAttribute("data-material", "clear");
  await expect(page.getByRole("button", { name: "高透白玻璃" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/glass-v5-high-transparency-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "原本霧面" }).click();
  await expect(stage).toHaveAttribute("data-material", "solid");
  expect(await stage.locator(".jfs-ui-surface--card").first().evaluate((el) =>
    getComputedStyle(el).backdropFilter)).toBe("none");
});

test("Glass transparency slider changes real white-glass alpha on a black background", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ui-showcase/");
  const stage = page.getByTestId("ui-showcase");
  const slider = page.getByRole("slider", { name: "玻璃透明度" });
  await expect(stage).toHaveAttribute("data-material", "crystal");
  await expect(slider).toHaveValue("7");
  const card = stage.locator(".jfs-ui-surface--card").first();
  const initial = await card.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(initial).toBe("rgba(255, 255, 255, 0.93)");
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("8");
  await expect(stage.getByText(/白色不透明度 92%/)).toBeVisible();
  const updated = await card.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(updated).toBe("rgba(255, 255, 255, 0.92)");
  await page.screenshot({ path: "test-results/glass-v5-white-8-percent-transparency-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "原本霧面" }).click();
  await expect(slider).toBeHidden();
  await page.getByRole("button", { name: "黑底白玻璃" }).click();
  await expect(slider).toHaveValue("8");
  expect(await card.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(updated);
});

test("Glass Lab: small screen remains usable with black canvas and white crystal tiles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ui-showcase/");
  await expect(page.getByTestId("ui-showcase")).toHaveAttribute("data-material", "crystal");
  await expect(page.getByRole("button", { name: "黑底白玻璃" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/glass-v5-white-crystal-mobile.png", fullPage: true });
});

for (const route of ["today", "nutrition", "training", "progress"] as const) {
  test(`Glass app: ${route} gets a frosted shell with no overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/" + route + "/");
    const app = page.locator(".app.jfs3-shell");
    await expect(app).toBeVisible();
    const canvasColor = await app.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(canvasColor).toBe("rgb(3, 3, 4)");
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
    if (route === "today") await page.screenshot({ path: "test-results/glass-v5-today-mobile.png", fullPage: true });
    if (route === "nutrition") await page.screenshot({ path: "test-results/glass-v5-nutrition-mobile.png", fullPage: true });
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

test("White glass appears bright on black while remaining actually translucent", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/today/");
  const app = page.locator(".app.jfs3-shell");
  expect(await app.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe("rgb(3, 3, 4)");
  const selectors = [
    [".today-v3-focus", 0.96], // raised GlassCard (93% baseline, 96% elevation)
    [".today-v3-water-actions button", 0.95],
    [".today-v3-focus-action", 0.96],
  ] as const;
  for (const [selector, opacity] of selectors) {
    const panel = page.locator(selector).first();
    await expect(panel).toBeVisible();
    const result = await panel.evaluate(el=>{
      const computed = getComputedStyle(el);
      return {color:computed.backgroundColor,blur:computed.backdropFilter};
    });
    expect(result.color,selector).toBe(`rgba(255, 255, 255, ${opacity})`);
    expect(result.blur).toContain("blur(");
  }
  await page.screenshot({path:"test-results/white-glass-93-percent-phone.png",fullPage:true});
});

test("Black canvas / white crystal: every small Today tile is raised translucent white", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  const app = page.locator(".app.jfs3-shell");
  await expect(app).toBeVisible();
  const miniTiles = page.locator(".today-v3-quick-item");
  await expect(miniTiles).toHaveCount(5);
  const sample = await miniTiles.first().evaluate(el => {
    const styles = getComputedStyle(el);
    return { color: styles.color, surface: styles.backgroundColor,
      blur: styles.backdropFilter, shadow: styles.boxShadow };
  });
  expect(sample.surface).toMatch(/rgba?\(255,\s*255,\s*255/);
  expect(sample.color).toBe("rgb(22, 23, 27)");
  expect(sample.blur).toContain("blur(");
  expect(sample.shadow).not.toBe("none");
  for (const selector of [".today-v3-focus", ".today-v3-water-actions button",
    ".today-v3-quick-item", ".today-v3-focus-action"]) {
    const color = await page.locator(selector).first().evaluate(el => getComputedStyle(el).backgroundColor);
    expect(color, selector).toMatch(/rgba?\(255,\s*255,\s*255/);
  }
});

test("Black canvas / white crystal: Navigation and desktop glass are light", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/today/");
  await expect(page.locator(".sidebar")).toBeVisible();
  const props = await page.locator(".sidebar").evaluate(el => ({
    bg: getComputedStyle(el).backgroundColor,
    blur: getComputedStyle(el).backdropFilter,
  }));
  expect(props.bg).toMatch(/rgba?\(255,\s*255,\s*255/);
  expect(props.blur).toContain("blur(");
  await page.screenshot({ path: "test-results/glass-v5-today-desktop.png", fullPage: true });
});

test("Dark-mode user preference does not turn white crystal panels smoke gray", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  const color = await page.locator(".today-v3-focus").evaluate(el => getComputedStyle(el).backgroundColor);
  expect(color).toMatch(/rgba?\(255,\s*255,\s*255/);
  expect(await page.locator(".app.jfs3-shell").evaluate(el => getComputedStyle(el).backgroundColor))
    .toBe("rgb(3, 3, 4)");
  await page.screenshot({path:"test-results/glass-v5-today-dark-preference.png",fullPage:true});
});

test("White crystal Nutrition: black canvas titles and readable glass tabs", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/nutrition/");
  await expect(page.locator(".nutrition-v3b")).toBeVisible();
  const title = await page.locator(".daily-page>.simple-heading h1").evaluate(el => getComputedStyle(el).color);
  expect(title).toBe("rgb(248, 248, 250)");
  const tab = page.locator(".nutrition-v3-tabs");
  const styles = await tab.evaluate(el=>({
    background:getComputedStyle(el).backgroundColor,
    blur:getComputedStyle(el).backdropFilter,
  }));
  expect(styles.background).toMatch(/rgba?\(255,\s*255,\s*255/);
  expect(styles.blur).toContain("blur(");
  const inactive = await tab.getByRole("link",{name:"Meals"}).evaluate(el=>getComputedStyle(el).color);
  expect(inactive).toBe("rgb(50, 51, 59)");
  await expect(page.locator(".nutrition-v3-meal-icons>button")).toHaveCount(4);
  await page.screenshot({path:"test-results/glass-v5-nutrition-readable-mobile.png",fullPage:true});
});

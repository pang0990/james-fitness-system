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
  test(`App material and navigation remain usable: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/" + route + "/");
    const app = page.locator(".app.jfs3-shell");
    await expect(app).toBeVisible();
    const canvasColor = await app.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(canvasColor).toBe(route === "today" ? "rgb(0, 0, 0)" : "rgb(3, 3, 4)");
    const backdrop = await page.locator(".topbar").evaluate(el => getComputedStyle(el).backdropFilter);
    if (route === "today") expect(backdrop).toBe("none");
    else expect(backdrop).toContain("blur(");
    const keySurface = route === "today" ? ".today-v3-focus" :
      route === "nutrition" ? ".nutrition-v3b" :
      route === "training" ? ".training-today" : ".direction-hero";
    await expect(page.locator(keySurface).first()).toBeVisible();
    const material = await page.locator(keySurface).first().evaluate(el => ({
      blur: getComputedStyle(el).backdropFilter,
      bg: getComputedStyle(el).backgroundColor,
      shadow: getComputedStyle(el).boxShadow,
    }));
    if (route === "today") {
      expect(material).toMatchObject({blur:"none",bg:"rgb(0, 0, 0)",shadow:"none"});
    } else {
      expect(material.blur).toContain("blur(");
      expect(material.bg).toMatch(/rgba?\(/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (route === "today") await page.screenshot({ path: "test-results/black-line-today-mobile.png", fullPage: true });
    if (route === "nutrition") await page.screenshot({ path: "test-results/glass-v5-nutrition-mobile.png", fullPage: true });
  });
}

test("Today reduced transparency keeps its black-line surface intact", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  const surface = page.locator(".today-v3-focus");
  await expect(surface).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.reduceTransparency = "true"; });
  const after = await surface.evaluate(el => ({
    blur: getComputedStyle(el).backdropFilter,
    background: getComputedStyle(el).backgroundColor,
  }));
  expect(after).toEqual({blur:"none",background:"rgb(0, 0, 0)"});
});

test("Today primary CTA is solid white, supporting panels stay black and outlined", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/today/");
  for (const selector of [".today-v3-focus",".today-v3-water-actions button",".today-v3-quick-item"]) {
    const el=page.locator(selector).first();
    await expect(el).toBeVisible();
    const style=await el.evaluate(node=>({
      bg:getComputedStyle(node).backgroundColor,
      blur:getComputedStyle(node).backdropFilter,
      shadow:getComputedStyle(node).boxShadow,
      width:getComputedStyle(node).borderTopWidth,
    }));
    expect(style,selector).toEqual({bg:"rgb(0, 0, 0)",blur:"none",shadow:"none",width:"1px"});
  }
  const primary=page.locator(".today-v3-focus-action");
  await expect(primary).toHaveCSS("background-color","rgb(255, 255, 255)");
  await expect(primary).toHaveCSS("color","rgb(0, 0, 0)");
  await page.screenshot({path:"test-results/today-blackline-phone.png",fullPage:true});
});

test("Today small shortcuts retain their five click targets, not white floating tiles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  const miniTiles=page.locator(".today-v3-quick-item");
  await expect(miniTiles).toHaveCount(5);
  const sample=await miniTiles.first().evaluate(el=>({
    surface:getComputedStyle(el).backgroundColor,
    ink:getComputedStyle(el).color,
    blur:getComputedStyle(el).backdropFilter,
    shadow:getComputedStyle(el).boxShadow,
    minHeight:el.getBoundingClientRect().height
  }));
  expect(sample.surface).toBe("rgb(0, 0, 0)");
  expect(sample.ink).toBe("rgb(255, 255, 255)");
  expect(sample.blur).toBe("none");
  expect(sample.shadow).toBe("none");
  expect(sample.minHeight).toBeGreaterThanOrEqual(44);
});

test("Today desktop sidebar follows black outline rules", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/today/");
  await expect(page.locator(".sidebar")).toBeVisible();
  const props=await page.locator(".sidebar").evaluate(el=>({
    bg:getComputedStyle(el).backgroundColor,
    shadow:getComputedStyle(el).boxShadow,
    blur:getComputedStyle(el).backdropFilter,
  }));
  expect(props).toEqual({bg:"rgb(0, 0, 0)",shadow:"none",blur:"none"});
  await page.screenshot({path:"test-results/today-blackline-desktop.png",fullPage:true});
});

test("Today stays pure black under dark-mode preference", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  await page.evaluate(() => { document.documentElement.dataset.theme="dark"; });
  await expect(page.locator(".today-v3-focus")).toHaveCSS("background-color","rgb(0, 0, 0)");
  await expect(page.locator(".app.jfs3-shell")).toHaveCSS("background-color","rgb(0, 0, 0)");
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

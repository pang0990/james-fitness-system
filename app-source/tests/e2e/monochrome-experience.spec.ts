import { test, expect, DATA_KEY } from "./authenticated";

test("minimal mobile: tactile Today, monochrome dock, accessible progress entry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/today/");
  await expect(page.locator("html")).toHaveAttribute("data-visual-style", "minimal");
  await expect(page.locator(".today-v3-focus")).toBeVisible();
  await expect(page.locator(".bottom-nav a.active")).toContainText("Today");
  await expect(page.locator(".today-v3 .jfs3-primary")).toHaveCount(1);
  await expect(page.locator(".today-v3-nutrition")).toBeVisible();
  const style = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const dock = getComputedStyle(document.querySelector(".bottom-nav")!);
    const active = getComputedStyle(document.querySelector(".bottom-nav a.active")!);
    const card = getComputedStyle(document.querySelector(".today-v3-focus")!);
    return {
      primary: html.getPropertyValue("--jfs2-ink").trim(),
      activeColor: active.color,
      dockShadow: dock.boxShadow,
      cardShadow: card.boxShadow,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  expect(style.primary).toBe("#19191b");
  expect(style.activeColor).toBe("rgb(255, 255, 255)"); // black-line selected navigation
  expect(style.dockShadow).not.toBe("none"); // subtle depth belongs to floating navigation only
  expect(style.cardShadow).toBe("none");
  expect(style.overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/monochrome-today-mobile.png", fullPage: true });
  await page.goto("/progress/");
  await expect(page.getByRole("link", { name: /記錄第一筆體重/ })).toBeVisible();
  await expect(page.locator(".bottom-nav")).toBeVisible();
  expect(errors).toEqual([]);
});

test("minimal Nutrition: rings use real fill values and grayscale gradients", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nutrition/");
  const ring = page.locator(".nutrition-v3b-energy-ring");
  await expect(ring).toBeVisible();
  await expect(page.getByTestId("nutrition-v3b")).toBeVisible();
  const visual = await ring.evaluate(el => ({
    bg: getComputedStyle(el).backgroundImage,
    progress: getComputedStyle(el).getPropertyValue("--nutrition-v3b-percent").trim(),
    width: Math.round(el.getBoundingClientRect().width),
  }));
  expect(visual.progress).toBe("0%");
  expect(visual.bg).toMatch(/conic-gradient/);
  expect(visual.bg).not.toMatch(/rgb\(0, 122, 255\)/);
  expect(visual.width).toBeLessThanOrEqual(160);
  await page.screenshot({ path: "test-results/monochrome-nutrition-mobile.png", fullPage: true });
});

test("minimal desktop: all four tabs load without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["today", "nutrition", "training", "progress"]) {
    await page.goto("/" + route + "/");
    await expect(page.locator(".main")).toBeVisible();
    if (route === "today") {
      await expect(page.locator(".sidebar .nav-item.active")).toBeVisible();
      await expect(page.locator(".bottom-nav")).toBeHidden();
      await page.screenshot({ path: "test-results/today-v3-desktop.png", fullPage: true });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: "test-results/monochrome-progress-desktop.png", fullPage: true });
});

test("motion and appearance: reduced-motion respected; dark Minimal stays grayscale", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/today/");
  await expect(page.locator(".today-v3-focus")).toBeVisible();
  const animation = await page.locator(".today-v3-focus").evaluate(el => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.appearance = { visualStyle: "minimal", theme: "dark", showCompanion: false };
    localStorage.setItem(key, JSON.stringify(state));
  }, DATA_KEY);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".today-v3-focus")).toBeVisible();
  const ink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--jfs2-ink").trim());
  expect(ink).toBe("#f5f5f7");
  await page.screenshot({ path: "test-results/monochrome-today-dark.png", fullPage: true });
});

test("in-app reduced motion: internal links do not request a view transition", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/today/");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.preferences = { ...(state.preferences || {}), reduceMotion: true };
    localStorage.setItem(key, JSON.stringify(state));
  }, DATA_KEY);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await page.evaluate(() => {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: () => { throw new Error("View transitions are not allowed when app reduced motion is on"); },
    });
  });
  await page.locator('.bottom-nav a[href*="/nutrition"]').click();
  await expect(page).toHaveURL(/\/nutrition\/?$/);
});

test("mobile bottom dock: final Today activity is reachable above the overlay", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  await expect(page.locator(".today-v3-activity>.daily-activity")).toBeVisible();
  const metrics = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const nav = document.querySelector(".bottom-nav")!.getBoundingClientRect();
    const activity = document.querySelector(".today-v3-activity>.daily-activity")!.getBoundingClientRect();
    return { navTop: nav.top, activityBottom: activity.bottom };
  });
  expect(metrics.activityBottom).toBeLessThan(metrics.navTop - 4);
});

test("Today 3: main action stays unique and water quick log persists", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/today/");
  await expect(page.getByTestId("today-v3")).toBeVisible();
  await expect(page.getByTestId("today-v3").locator(".jfs3-primary")).toHaveCount(1);
  await page.getByRole("button", {name:"+250 ml", exact:true}).click();
  await expect(page.locator(".today-v3-water-feedback")).toHaveCount(0);
  await expect(page.locator(".today-v3-water-total strong")).toContainText("250");
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".today-v3-water-total strong")).toContainText("250");
  await page.getByRole("button", {name:"加入飲食"}).click();
  await expect(page.locator(".inline-nutrition")).toBeVisible();
});

test("Today 3: small-screen layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({width:375,height:812});
  await page.goto("/today/");
  await expect(page.getByTestId("today-v3")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("Black Line Refined: floating navigation remains inset and accessible at mobile/desktop widths",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/today/");
  const mobile=page.locator(".bottom-nav");
  await expect(mobile).toBeVisible();
  const dock=await mobile.evaluate(el=>{
    const b=el.getBoundingClientRect(),s=getComputedStyle(el);
    return {left:b.left,right:innerWidth-b.right,bottom:innerHeight-b.bottom,radius:parseFloat(s.borderRadius),shadow:s.boxShadow,height:b.height};
  });
  expect(dock.left).toBeGreaterThanOrEqual(10);
  expect(dock.right).toBeGreaterThanOrEqual(10);
  expect(dock.bottom).toBeGreaterThanOrEqual(8);
  expect(dock.radius).toBeGreaterThanOrEqual(16);
  expect(dock.shadow).not.toBe("none");
  expect(dock.height).toBeGreaterThanOrEqual(60);
  await page.setViewportSize({width:1440,height:900});
  await page.reload();
  const desktop=page.locator(".sidebar");
  await expect(desktop).toBeVisible();
  const rail=await desktop.evaluate(el=>{
    const b=el.getBoundingClientRect(),s=getComputedStyle(el);
    return {left:b.left,top:b.top,bottom:innerHeight-b.bottom,radius:parseFloat(s.borderRadius),shadow:s.boxShadow};
  });
  expect(rail.left).toBeGreaterThanOrEqual(12);
  expect(rail.top).toBeGreaterThanOrEqual(12);
  expect(rail.bottom).toBeGreaterThanOrEqual(12);
  expect(rail.radius).toBeGreaterThanOrEqual(16);
  expect(rail.shadow).not.toBe("none");
});

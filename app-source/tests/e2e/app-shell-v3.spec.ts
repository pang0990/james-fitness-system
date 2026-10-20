import { test, expect } from "./authenticated";

const sections = ["today", "nutrition", "training", "progress"] as const;

for (const [width, height, dock] of [
  [390, 844, true],
  [768, 1024, true],
  [1024, 768, false],
  [1440, 900, false],
] as const) {
  test(`shared Minimal shell: all 4 workspaces at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const section of sections) {
      await page.goto("/" + section + "/");
      await expect(page.locator(".app.jfs3-shell")).toBeVisible();
      await expect(page.locator(".topbar")).toBeVisible();
      const sidebar = page.getByRole("navigation", { name: "桌面主導覽" });
      const bottom = page.getByRole("navigation", { name: "手機主導覽" });
      if (dock) {
        await expect(bottom).toBeVisible();
        await expect(sidebar).toBeHidden();
        await expect(bottom.getByRole("link", { name: new RegExp("^" + section + "$", "i") }))
          .toHaveAttribute("aria-current", "page");
      } else {
        await expect(sidebar).toBeVisible();
        await expect(bottom).toBeHidden();
        await expect(sidebar.getByRole("link", { name: new RegExp("^" + section + "$", "i") }))
          .toHaveAttribute("aria-current", "page");
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        section + " at " + width + "px must not overflow",
      ).toBeLessThanOrEqual(1);
    }
    if (width === 390 || width === 1440) {
      await page.screenshot({
        path: "test-results/app-shell-v3-" + width + ".png",
        fullPage: true,
      });
    }
  });
}

test("shared action and data components keep real save flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/");
  await expect(page.locator(".jfs-ui-action--primary")).toHaveCount(1);
  await expect(page.locator(".today-v3-focus.jfs-glass-card")).toBeVisible();
  await page.getByRole("button", { name: "+250 ml", exact: true }).click();
  const track = page.locator(".jfs-ui-progress.today-v3-water-track");
  await expect(track).toBeVisible();
  await expect(page.locator(".today-v3-water-total strong")).toContainText("250");
});

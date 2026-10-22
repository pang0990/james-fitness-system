import { test, expect } from "@playwright/test";

test.skip(process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW !== "1",
  "Only run against an explicitly isolated review-mode build.");

const tabs = [
  { path: "today", testId: "today-v3" },
  { path: "nutrition", testId: "nutrition-v3b" },
  { path: "training", testId: "preview-training" },
  { path: "progress", testId: "preview-progress" },
];

test("four workspaces show real app UI with synthetic records at mobile and desktop widths",
  async ({ page }, testInfo) => {
    const remoteAuthRequests: string[] = [];
    page.on("request", request => {
      if (new URL(request.url()).hostname.endsWith(".supabase.co")) remoteAuthRequests.push(request.url());
    });
    for (const [label, width, height] of [
      ["mobile", 390, 844], ["desktop", 1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const { path, testId } of tabs) {
        await page.goto("/" + path + "/");
        await expect(page.getByTestId("jfs-review-banner")).toBeVisible();
        await expect(page.locator("main.main")).toBeVisible();
        if (path === "today" || path === "nutrition") {
          await expect(page.getByTestId(testId)).toBeVisible();
        } else if (path === "training") {
          await expect(page.locator(".training-v3")).toBeVisible();
          await expect(page.locator(".training-v3-exercises")).toBeVisible();
        } else {
          await expect(page.locator(".progress-direction")).toBeVisible();
          await expect(page.locator(".progress-v3-stats")).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
          .toBeLessThanOrEqual(1);
        await page.screenshot({
          path: testInfo.outputPath("review-" + path + "-" + label + ".png"),
          fullPage: true,
        });
      }
    }
    expect(remoteAuthRequests).toEqual([]);
  },
);

test("review-only identity and storage are separate; water edit persists and can reset",
  async ({ page }) => {
    const blocked: string[] = [];
    page.on("request", r => {
      if (new URL(r.url()).hostname.endsWith(".supabase.co")) blocked.push(r.url());
    });
    await page.goto("/today/");
    await expect(page.getByTestId("jfs-review-banner")).toContainText("虛構初始資料");
    const initial = await page.evaluate(() => ({
      isolated: localStorage.getItem("jfs-isolated-review-v1:00000000-0000-4000-8000-000000000099"),
      realScoped: localStorage.getItem("james-fitness-user-v1:00000000-0000-4000-8000-000000000099"),
      auth: localStorage.getItem("jfs-google-session-v1"),
    }));
    expect(initial.isolated).toBeTruthy();
    expect(initial.realScoped).toBeNull();
    expect(initial.auth).toBeNull();
    await expect(page.locator(".today-v3-water-total strong")).toContainText("750");
    await page.getByRole("button", { name: "+250 ml", exact: true }).click();
    await expect(page.locator(".today-v3-water-total strong")).toContainText("1,000");
    await page.reload();
    await expect(page.locator(".today-v3-water-total strong")).toContainText("1,000");
    page.once("dialog", d => d.accept());
    await page.getByRole("button", { name: "還原虛構測試資料" }).click();
    await expect(page.locator(".today-v3-water-total strong")).toContainText("750");
    expect(blocked).toEqual([]);
  },
);

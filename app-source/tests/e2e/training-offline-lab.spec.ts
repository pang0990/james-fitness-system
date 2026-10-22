import { test, expect } from "@playwright/test";

test.skip(process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW !== "1" ||
          process.env.NEXT_PUBLIC_JFS_OFFLINE_DEV_LAB !== "1",
  "Only usable in an isolated synthetic-data preview build");

test("Web Training Core set -> atomic IndexedDB + Outbox -> reload survives",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/dev/offline-training/");
  await expect(page.getByTestId("offline-lab-sets")).toContainText("0");
  await expect(page.getByTestId("offline-lab-pending")).toContainText("0");
  await page.getByRole("button",{name:/新增示範組次/}).click();
  await expect(page.getByTestId("offline-lab-sets")).toContainText("1");
  await expect(page.getByTestId("offline-lab-pending")).toContainText("1");
  await page.reload();
  await expect(page.getByTestId("offline-lab-sets")).toContainText("1");
  await expect(page.getByTestId("offline-lab-pending")).toContainText("1");
  await page.getByRole("button",{name:/新增示範組次/}).click();
  await expect(page.getByTestId("offline-lab-sets")).toContainText("2");
  await expect(page.getByTestId("offline-lab-pending")).toContainText("2");
  await page.reload();
  await expect(page.getByTestId("offline-lab-sets")).toContainText("2");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))
    .toBeLessThanOrEqual(1);
});

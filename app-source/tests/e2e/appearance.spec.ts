import { test, expect, DATA_KEY } from "./authenticated";

test("saved appearance follows system after reload and keeps all workspaces reachable", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({ colorScheme:"light" });
  await page.goto("/settings/appearance/");
  await page.getByLabel("明暗模式").selectOption("system");
  await page.getByRole("button",{name:"儲存並套用"}).click();
  await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||"{}").appearance?.theme,DATA_KEY)).toBe("system");
  await page.reload();
  await page.emulateMedia({colorScheme:"dark"});
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  for(const route of ["today","nutrition","training","progress"]) {
    await page.goto("/"+route+"/");
    await expect(page.getByRole("navigation",{name:"手機主導覽"})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
});

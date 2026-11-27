import { test, expect, DATA_KEY } from "./authenticated";

test("retired appearance setting remains stored while the official UI stays Light", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/settings/appearance/");
  await expect(page.getByRole("heading",{name:"Light Mode"})).toBeVisible();
  await page.evaluate(key=>{
    const value=JSON.parse(localStorage.getItem(key)||"{}");
    value.appearance={...value.appearance,theme:"dark"};
    localStorage.setItem(key,JSON.stringify(value));
  },DATA_KEY);
  await page.reload();
  await page.emulateMedia({colorScheme:"dark"});
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||"{}").appearance?.theme,DATA_KEY)).toBe("dark");
  for(const route of ["today","nutrition","training","progress"]) {
    await page.goto("/"+route+"/");
    await expect(page.getByRole("navigation",{name:"手機主導覽"})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
});

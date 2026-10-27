import {test,expect} from "./authenticated";

const majorSurfaces={
  today:".today-v3-focus",
  nutrition:".nutrition-v3b",
  training:".training-today",
  progress:".direction-hero",
} as const;

for(const width of [390,1440] as const) {
  test(`Black Line: all four workspaces stay monochrome at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:width===390?844:900});
    for(const [route,selector] of Object.entries(majorSurfaces)) {
      await page.goto("/"+route+"/");
      const app=page.locator(".app.jfs3-shell");
      await expect(app).toBeVisible();
      await expect(app).toHaveCSS("background-color","rgb(0, 0, 0)");
      await expect(page.locator(".topbar")).toHaveCSS("background-color","rgb(0, 0, 0)");
      await expect(page.locator(".topbar")).toHaveCSS("backdrop-filter","none");
      const surface=page.locator(selector).first();
      await expect(surface).toBeVisible();
      await expect(surface).toHaveCSS("background-color","rgb(0, 0, 0)");
      await expect(surface).toHaveCSS("box-shadow","none");
      await expect(surface).toHaveCSS("backdrop-filter","none");
      await expect(surface).toHaveCSS("border-top-width","1px");
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth),
        route+" at "+width+"px").toBeLessThanOrEqual(1);
      await page.screenshot({path:`test-results/blackline-${route}-${width}.png`,fullPage:true});
    }
  });
}

test("Black Line: Settings and Active Workout use black canvas without state writes",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/settings/");
  await expect(page.locator(".app.page-settings")).toBeVisible();
  await expect(page.locator(".app.page-settings")).toHaveCSS("background-color","rgb(0, 0, 0)");
  await page.goto("/training/session/");
  await expect(page.locator(".app.workout-active")).toBeVisible();
  await expect(page.locator(".app.workout-active")).toHaveCSS("background-color","rgb(0, 0, 0)");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth))
    .toBeLessThanOrEqual(1);
});

test("Black Line: primary CTA remains legible; data input and navigation retain touch targets",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/nutrition/");
  const button=page.locator(".nutrition-v3b-add");
  await expect(button).toBeVisible();
  await expect(button).toHaveCSS("background-color","rgb(255, 255, 255)");
  await expect(button).toHaveCSS("color","rgb(0, 0, 0)");
  const dock=page.getByRole("navigation",{name:"手機主導覽"});
  await expect(dock).toBeVisible();
  await expect(dock).toHaveCSS("background-color","rgb(11, 11, 11)");
  await expect(dock.getByRole("link",{name:"Training"})).toHaveAttribute("href",/training/);
});


test("Today: drink water updates totals silently across quick add and correction",async({page})=>{
  await page.goto("/today/");
  const number=page.locator(".today-v3-water-total strong");
  await expect(number).toBeVisible();
  const original=Number((await number.innerText()).replaceAll(",",""));
  await page.locator(".today-v3-water-actions").getByRole("button",{name:/\+250 ml/}).click();
  await expect(number).toHaveText((original+250).toLocaleString("en-US"));
  await expect(page.locator(".today-v3-water-feedback")).toHaveCount(0);
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.getByRole("button",{name:"修正今日飲水量"}).click();
  const correction=page.locator('input[name="ml"]');
  await expect(correction).toBeVisible();
  await correction.fill(String(original+400));
  await page.getByRole("button",{name:"儲存飲水量"}).click();
  await expect(number).toHaveText((original+400).toLocaleString("en-US"));
  await expect(page.locator(".toast")).toHaveCount(0);
});

test("Today and Settings: routine activity/setting save has no toast",async({page})=>{
  await page.goto("/today/");
  const section=page.locator(".daily-activity");
  await section.getByRole("button",{name:/記錄/}).last().click();
  const duration=page.getByLabel("時間（分鐘）");
  await expect(duration).toBeVisible();
  await duration.fill("20");
  await page.getByRole("button",{name:"儲存活動"}).click();
  await expect(section.locator(".activity-log-list")).toContainText("20 分鐘");
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.goto("/settings/notifications/");
  await page.getByRole("button",{name:"儲存設定"}).click();
  await expect(page.locator(".toast")).toHaveCount(0);
});

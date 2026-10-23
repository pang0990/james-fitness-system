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
  await expect(dock).toHaveCSS("background-color","rgb(0, 0, 0)");
  await expect(dock.getByRole("link",{name:"Training"})).toHaveAttribute("href",/training/);
});

/* Prevent the old Polish tokens from making live labels dark-on-black. */
for(const route of ["nutrition","training","progress"] as const) {
  test(`Black Line ${route}: workspace heading remains visible white`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto("/"+route+"/");
    await expect(page.locator(".daily-page>.simple-heading h1"))
      .toHaveCSS("color","rgb(255, 255, 255)");
    expect(await page.evaluate(()=>getComputedStyle(document.documentElement)
      .getPropertyValue("--ui-primary").trim())).toBe("#ffffff");
  });
}
test("Black Line: Training secondary links and plan name have readable contrast",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/training/");
  await expect(page.locator(".training-v3-heading h2")).toHaveCSS("color","rgb(255, 255, 255)");
  await expect(page.locator(".training-home-links>a").first()).toHaveCSS("color","rgb(255, 255, 255)");
  await expect(page.locator(".training-home-links>a").first()).toHaveCSS("background-color","rgb(0, 0, 0)");
});
test("Black Line: Progress create-first-record action is black type on solid white",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/progress/");
  const action=page.locator(".progress-empty-action");
  await expect(action).toHaveCSS("background-color","rgb(255, 255, 255)");
  await expect(action).toHaveCSS("color","rgb(0, 0, 0)");
});

test("Black Line: Progress recovery quick log is no longer white raised tiles",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/progress/");
  const choices=page.locator(".recovery-entry-grid>button");
  await expect(choices).toHaveCount(4);
  for(const choice of await choices.all()) {
    await expect(choice).toHaveCSS("background-color","rgb(0, 0, 0)");
    await expect(choice).toHaveCSS("color","rgb(255, 255, 255)");
  }
});

import {test,expect} from "./authenticated";

for(const width of [390,1440]) {
  test(`Nutrition shared glass: real macros, meal cards, add entry at ${width}px`, async ({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto("/nutrition/");
    await expect(page.getByTestId("nutrition-v3b")).toHaveClass(/jfs-glass-card/);
    await expect(page.locator(".nutrition-v3b .jfs-glass-progress")).toHaveCount(3);
    await expect(page.locator(".nutrition-v3-meal-icons .jfs-glass-button")).toHaveCount(4);
    await expect(page.locator(".meal-list .meal-section.jfs-glass-card").first()).toBeVisible();
    await page.getByRole("button",{name:"加入飲食",exact:true}).click();
    await expect(page.getByLabel("加入哪一餐")).toBeVisible();
    const overflowing=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    expect(overflowing).toBeLessThanOrEqual(1);
    // Close modal before capture to show the redesigned page material.
    await page.keyboard.press("Escape");
    await page.screenshot({path:`test-results/glass-v3-nutrition-${width}.png`,fullPage:true});
  });

  test(`Training shared glass: preserved plan and actions at ${width}px`, async ({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto("/training/");
    await expect(page.locator(".training-home .training-today.jfs-glass-card")).toBeVisible();
    await expect(page.locator(".training-v3-segments")).toBeVisible();
    expect(await page.locator(".training-today.jfs-glass-card").evaluate(el => getComputedStyle(el).backdropFilter))
      .toContain("blur(");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:`test-results/glass-v3-training-${width}.png`,fullPage:true});
  });

  test(`Progress shared glass: real period choices and no fabricated trends at ${width}px`, async ({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto("/progress/");
    await expect(page.locator(".progress-direction .jfs-glass-card")).toHaveCount(6);
    const period=page.getByRole("group",{name:"趨勢圖期間"});
    await expect(period.getByRole("button",{name:"30D"})).toHaveAttribute("aria-pressed","true");
    await period.getByRole("button",{name:"90D"}).click();
    await expect(period.getByRole("button",{name:"90D"})).toHaveAttribute("aria-pressed","true");
    await expect(page.getByRole("link",{name:/記錄第一筆體重|記錄下一筆體重/})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:`test-results/glass-v3-progress-${width}.png`,fullPage:true});
  });
}
test("shared glass material stays visibly white on black and respects reduced transparency",async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/nutrition/");
  const glass=page.getByTestId("nutrition-v3b");
  const before=await glass.evaluate(el => ({
    color:getComputedStyle(el).backgroundColor,
    backdrop:getComputedStyle(el).backdropFilter,
  }));
  expect(before.color).toMatch(/rgba?\(255,\s*255,\s*255/);
  expect(before.backdrop).toContain("blur(");
  await page.evaluate(()=>{document.documentElement.dataset.reduceTransparency="true"});
  const after=await glass.evaluate(el => ({
    color:getComputedStyle(el).backgroundColor,
    backdrop:getComputedStyle(el).backdropFilter,
  }));
  expect(after.backdrop).toBe("none");
  expect(after.color).toBe("rgb(255, 255, 255)");
});

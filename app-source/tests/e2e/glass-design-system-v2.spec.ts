import { test, expect } from "./authenticated";

test("Glass System 2.0 showcase: actual nested glass materials, live progress and selection", async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/ui-showcase/");
  const lab=page.getByTestId("glass-system-v2-lab");
  await expect(lab).toBeVisible();
  await expect(lab.locator(".jfs-glass-card")).toHaveCount(2);
  const bar=lab.getByRole("progressbar",{name:"示範飲水進度"});
  await expect(bar).toHaveAttribute("aria-valuenow","250");
  await lab.getByRole("button",{name:"+250 ml",exact:true}).click();
  await expect(bar).toHaveAttribute("aria-valuenow","500");
  await expect(lab.locator(".jfs-glass-live-number strong")).toHaveText("500");
  await lab.getByRole("button",{name:"Food"}).click();
  await expect(lab.getByRole("button",{name:"Food"})).toHaveAttribute("aria-pressed","true");
  await expect(lab.getByText("選中：nutrition")).toBeVisible();
  await page.screenshot({path:"test-results/glass-ds2-showcase-desktop.png",fullPage:true});
});

test("Glass System 2.0 sheet: keyboard focus, escape, backdrop and scroll restoration", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/ui-showcase/");
  const lab=page.getByTestId("glass-system-v2-lab");
  await lab.getByRole("button",{name:"開啟玻璃面板"}).click();
  const sheet=page.getByRole("dialog",{name:"玻璃 Bottom Sheet"});
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button",{name:"關閉視窗"})).toBeFocused();
  expect(await page.evaluate(()=>getComputedStyle(document.body).overflow)).toBe("hidden");
  await expect(sheet.getByRole("spinbutton",{name:"示範數字"})).toHaveValue("250");
  await page.screenshot({path:"test-results/glass-ds2-sheet-mobile.png",fullPage:false});
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe("");
  await expect(lab.getByRole("button",{name:"開啟玻璃面板"})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

for(const width of [390,1440]) {
  test(`Today Glass System 2.0: cards, water and sheet at ${width}px`, async ({page})=>{
    await page.setViewportSize({width,height:width===390?844:900});
    await page.goto("/today/");
    await expect(page.locator(".today-v3 .jfs-glass-card")).toHaveCount(6);
    await expect(page.locator(".today-v3-quick-grid .jfs-glass-button")).toHaveCount(5);
    const water=page.getByRole("img",{name:/今日飲水進度/});
    await expect(water).toBeVisible();
    await page.getByRole("button",{name:"+250 ml",exact:true}).click();
    await expect(page.locator(".today-v3-water-total strong")).toContainText("250");
    await page.getByRole("button",{name:"修正今日飲水量"}).click();
    const dialog=page.getByRole("dialog",{name:"修正今日飲水"});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("spinbutton",{name:"今日總飲水量 ml"})).toHaveValue("250");
    await dialog.getByRole("spinbutton",{name:"今日總飲水量 ml"}).fill("700");
    await dialog.getByRole("button",{name:"儲存飲水量"}).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(".today-v3-water-total strong")).toContainText("700");
    await page.reload();
    await expect(page.locator(".today-v3-water-total strong")).toContainText("700");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:`test-results/glass-ds2-today-${width}.png`,fullPage:true});
  });
}

for (const width of [375, 390, 430]) {
  test(`mobile ${width}px: quick-log Chinese labels and water buttons stay on one line`, async ({page})=>{
    await page.setViewportSize({width,height:844});
    await page.goto("/today/");
    const tiles = await page.locator(".today-v3-quick-item").evaluateAll(elements => elements.map(button => {
      const label = button.querySelector("span")!;
      const rect = label.getBoundingClientRect();
      const container = button.getBoundingClientRect();
      return {
        text: label.textContent,
        whiteSpace: getComputedStyle(label).whiteSpace,
        within: rect.left >= container.left - 1 && rect.right <= container.right + 1,
      };
    }));
    expect(tiles).toHaveLength(5);
    for (const tile of tiles) {
      expect(tile.whiteSpace, tile.text ?? "").toBe("nowrap");
      expect(tile.within, tile.text ?? "").toBe(true);
    }
    const water = await page.locator(".today-v3-water-actions .jfs-glass-button").evaluateAll(elements =>
      elements.map(el => ({
        whiteSpace:getComputedStyle(el).whiteSpace,
        inside: el.scrollWidth <= el.clientWidth + 1,
      }))
    );
    expect(water).toHaveLength(2);
    for (const button of water) {
      expect(button.whiteSpace).toBe("nowrap");
      expect(button.inside).toBe(true);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    if(width === 390) {
      await page.screenshot({path:"test-results/glass-ds2-today-390-polished.png",fullPage:true});
    }
  });
}

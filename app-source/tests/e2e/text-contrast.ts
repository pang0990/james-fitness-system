import type { Locator } from "@playwright/test";

export function textContrast(locator: Locator) {
  return locator.evaluate(el => {
    function luminance(color: string) {
      const [r,g,b] = color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>{
        const c=n/255;
        return c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4;
      });
      return .2126*r+.7152*g+.0722*b;
    }
    let parent: Element | null = el;
    while (parent) {
      const background = getComputedStyle(parent).backgroundColor;
      if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
        const a = luminance(getComputedStyle(el).color), b = luminance(background);
        return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      }
      parent=parent.parentElement;
    }
    throw new Error("No opaque background for contrast measurement");
  });
}

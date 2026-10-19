import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`signed-out routes show Google login without overflow (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const route of ["/today/", "/nutrition/", "/training/", "/progress/"]) {
      await page.goto(route);
      await expect(page.getByRole("button", { name: /CONTINUE WITH GOOGLE/ })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `horizontal overflow at ${route}`).toBe(false);
    }
    expect(errors).toEqual([]);
  });
}
test("OAuth callback without authorization code fails safely", async ({ page }) => {
  await page.goto("/auth/callback/");
  await expect(page.getByRole("heading", { name: "SIGN IN FAILED" })).toBeVisible();
  await expect(page.getByRole("link", { name: /RETRY GOOGLE SIGN IN/ })).toBeVisible();
});

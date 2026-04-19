import { test, expect } from "@playwright/test";

test("loads home", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});

const { test, expect } = require("@playwright/test");

test("dashboard shell renders the branded header and navigation", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByAltText("2020 Foresight Executive Talent Solutions")).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Organizations" })).toBeVisible();
  await expect(page.getByText("Collapse sidebar")).toBeVisible();

  await expect(page).toHaveScreenshot("dashboard-shell.png", {
    fullPage: true
  });
});

test("admin data list opens a selected item instead of reloading the list page", async ({ page }) => {
  await page.goto("/admin/data");

  await expect(page.getByRole("heading", { name: "Data" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nicknames" })).toBeVisible();

  await page.getByRole("link", { name: "Nicknames" }).click();

  await expect(page).toHaveURL(/\/admin\/data\/crm\.data%3Anicknames$/);
  await expect(page.getByRole("heading", { name: "Nicknames" })).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue("Nickname crosswalk for person matching");
});

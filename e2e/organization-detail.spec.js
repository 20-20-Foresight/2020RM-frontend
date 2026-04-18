const { test, expect } = require("@playwright/test");

test("organization detail renders the stitched overview and contacts tabs", async ({ page }) => {
  await page.goto("/organization/org-stellar");

  const detailPage = page.getByTestId("organization-detail-page");

  await expect(page.getByRole("heading", { name: "Stellar Dynamics Corp" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contacts" })).toBeVisible();
  await expect(page.getByText("Account Health")).toBeVisible();

  await expect(detailPage).toHaveScreenshot("organization-detail-overview.png");

  await page.getByRole("link", { name: "Contacts" }).click();

  await expect(page).toHaveURL(/\/organization\/org-stellar\/people$/);
  await expect(page.getByRole("heading", { name: "Directory" })).toBeVisible();
  await expect(detailPage).toHaveScreenshot("organization-detail-contacts.png");
});

const { test, expect } = require("@playwright/test");

test("contact detail renders the stitched overview and secondary tabs", async ({ page }) => {
  await page.goto("/person/person-stellar");

  const detailPage = page.getByTestId("person-detail-page");

  await expect(page.getByRole("heading", { name: "Eleanor Vance" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lists" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Similar Contacts" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notes" })).toBeVisible();
  await expect(page.getByText("Professional Summary")).toBeVisible();

  await expect(detailPage).toHaveScreenshot("contact-detail-overview.png");

  await page.getByRole("link", { name: "Lists" }).click();

  await expect(page).toHaveURL(/\/person\/person-stellar\/lists$/);
  await expect(page.getByRole("columnheader", { name: "List Title" })).toBeVisible();

  await page.getByRole("link", { name: "Similar Contacts" }).click();

  await expect(page).toHaveURL(/\/person\/person-stellar\/similar-contacts$/);
  await expect(page.getByText("Elena Rodriguez")).toBeVisible();
  await expect(detailPage).toHaveScreenshot("contact-detail-similar-contacts.png");

  await page.getByRole("link", { name: "Notes" }).click();

  await expect(page).toHaveURL(/\/person\/person-stellar\/notes$/);
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
});

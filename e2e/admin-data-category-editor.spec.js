const { test, expect } = require("@playwright/test");

/**
 * Waits until the category editor route and shell have both rendered.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<void>}
 */
async function openFocusCategoryEditor(page) {
  await page.goto("/admin/data/crm.data%3Afocus");

  await expect(page).toHaveURL(/\/admin\/data\/crm\.data%3Afocus$/);
  await expect(page.getByRole("heading", { name: "Focus" })).toBeVisible();
  await expect(page.getByText("3rd Party Property Management")).toBeVisible();
}

test("focus category editor renders the authenticated shell and inline cards", async ({ page }) => {
  await openFocusCategoryEditor(page);
  const firstCard = page.getByRole("heading", { name: "3rd Party Property Management" }).locator("..").locator("..").locator("..");

  await expect(page.getByAltText("2020 Foresight Executive Talent Solutions")).toBeVisible();
  await expect(page.getByRole("link", { name: "Organizations" })).toBeVisible();
  await expect(firstCard.getByText("Description:")).toBeVisible();
  await expect(firstCard.getByText("Examples:")).toBeVisible();
  await expect(firstCard.getByText("This is a focus area for")).toBeVisible();
  await expect(firstCard.getByText("cookies")).toBeVisible();

  await expect(page).toHaveScreenshot("focus-category-editor.png", {
    fullPage: true
  });
});

test("focus category editor opens the Toast rich text editor in WYSIWYG mode", async ({ page }) => {
  await openFocusCategoryEditor(page);

  await page.getByRole("button", { name: "Edit" }).first().click();
  const editorRoot = page.locator(".toastui-editor-defaultUI").first();

  await expect(page.getByRole("heading", { name: "Edit Category" })).toBeVisible();
  await expect(editorRoot).toBeVisible();
  await expect(editorRoot.locator(".toastui-editor-toolbar")).toBeVisible();
  await expect(editorRoot.locator(".toastui-editor-ww-container")).toBeVisible();
  await expect(editorRoot.locator(".toastui-editor-md-container")).toBeHidden();
  await expect(editorRoot.locator(".toastui-editor-mode-switch")).toBeHidden();
  await expect(editorRoot.locator(".toastui-editor-ww-container .toastui-editor-contents")).toContainText("This is a focus area for");
});

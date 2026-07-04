const test = require("node:test");
const assert = require("node:assert/strict");

async function loadModule() {
  return import("../app/models/feed-form-intent.mjs");
}

test("readFeedFormIntent returns the last non-empty _action value", async () => {
  const { readFeedFormIntent } = await loadModule();
  const formData = new FormData();
  formData.append("_action", "update");
  formData.append("_action", "delete");

  assert.equal(readFeedFormIntent(formData), "delete");
});

test("readFeedFormIntent preserves the default single intent", async () => {
  const { readFeedFormIntent } = await loadModule();
  const formData = new FormData();
  formData.append("_action", "update");

  assert.equal(readFeedFormIntent(formData), "update");
});

test("readFeedFormIntent falls back when the form omits _action", async () => {
  const { readFeedFormIntent } = await loadModule();
  const formData = new FormData();

  assert.equal(readFeedFormIntent(formData, "update"), "update");
});

const test = require("node:test");
const assert = require("node:assert/strict");

const { readOptionalFormBoolean } = require("../app/models/sif-taxonomy-route.server");

test("readOptionalFormBoolean returns undefined when the form omits the field", () => {
  const formData = new FormData();

  assert.equal(readOptionalFormBoolean(formData, "active"), undefined);
});

test("readOptionalFormBoolean reads checked checkbox payloads as true", () => {
  const formData = new FormData();
  formData.append("active", "false");
  formData.append("active", "true");

  assert.equal(readOptionalFormBoolean(formData, "active"), true);
});

test("readOptionalFormBoolean reads unchecked checkbox payloads as false", () => {
  const formData = new FormData();
  formData.append("crosswalkOnly", "false");

  assert.equal(readOptionalFormBoolean(formData, "crosswalkOnly"), false);
});


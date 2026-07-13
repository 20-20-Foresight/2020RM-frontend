const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_RETURN_TO_PATH,
  buildAuthLoginPath,
  buildSigninPath,
  getReturnToFromRequestUrl,
  normalizeReturnToPath
} = require("../src/auth/return-to");

test("normalizeReturnToPath keeps safe in-app paths", () => {
  assert.equal(
    normalizeReturnToPath("/organization/org-stellar/people?sort=title"),
    "/organization/org-stellar/people?sort=title"
  );
});

test("normalizeReturnToPath falls back for external URLs and auth routes", () => {
  assert.equal(normalizeReturnToPath("https://evil.example/phish"), DEFAULT_RETURN_TO_PATH);
  assert.equal(normalizeReturnToPath("//evil.example/phish"), DEFAULT_RETURN_TO_PATH);
  assert.equal(normalizeReturnToPath("/auth/callback"), DEFAULT_RETURN_TO_PATH);
  assert.equal(normalizeReturnToPath("/signin"), DEFAULT_RETURN_TO_PATH);
  assert.equal(normalizeReturnToPath("/auth/logout"), DEFAULT_RETURN_TO_PATH);
  assert.equal(normalizeReturnToPath("/signout"), DEFAULT_RETURN_TO_PATH);
});

test("buildSigninPath includes returnTo for non-default destinations", () => {
  assert.equal(
    buildSigninPath("/organization/org-stellar"),
    "/signin?returnTo=%2Forganization%2Forg-stellar"
  );
});

test("buildAuthLoginPath omits the query for the default dashboard fallback", () => {
  assert.equal(buildAuthLoginPath(DEFAULT_RETURN_TO_PATH), "/auth/login");
});

test("getReturnToFromRequestUrl preserves pathname and search", () => {
  assert.equal(
    getReturnToFromRequestUrl("http://localhost:3000/organization/org-stellar?tab=people"),
    "/organization/org-stellar?tab=people"
  );
});

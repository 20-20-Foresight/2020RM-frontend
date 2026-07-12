const fs = require("node:fs/promises");
const { getReturnToFromRequestUrl } = require("../../src/auth/return-to");

/**
 * Loads one JSON session-meta fixture from disk when configured for local tests.
 * @returns {Promise<object|null>}
 */
async function loadSessionMetaFixture() {
  const fixturePath = process.env.SESSION_META_FIXTURE_PATH;
  if (typeof fixturePath !== "string" || !fixturePath.trim()) {
    return null;
  }

  return JSON.parse(await fs.readFile(fixturePath.trim(), "utf8"));
}

/**
 * Loads the backend-authored session meta payload through the frontend BFF.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<object>}
 */
async function loadSessionMeta(options) {
  const fixture = await loadSessionMetaFixture();
  if (fixture) {
    return fixture;
  }

  const fetchImpl = options.fetchImpl || fetch;
  const apiUrl = new URL("/api/meta", options.request.url);
  let response;
  try {
    response = await fetchImpl(apiUrl.toString(), {
      headers: {
        cookie: options.request.headers.get("cookie") || ""
      }
    });
  } catch (_error) {
    return {
      redirectToLogout: true
    };
  }

  if (response.status === 401) {
    return {
      redirectToSignin: true,
      returnTo: getReturnToFromRequestUrl(options.request.url)
    };
  }

  return await response.json();
}

module.exports = {
  loadSessionMeta
};

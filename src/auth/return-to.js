"use strict";

const DEFAULT_RETURN_TO_PATH = "/dashboard";

const DISALLOWED_RETURN_TO_PATHS = new Set([
  "/signin",
  "/signin.html",
  "/auth/login",
  "/auth/callback",
  "/auth/app-logout",
  "/auth/logout",
  "/auth/microsoft-logout",
  "/signout"
]);

/**
 * Normalizes one requested in-app redirect path and falls back to the dashboard
 * for unsafe or auth-looping destinations.
 * @param {string|null|undefined} value
 * @param {string} [fallback]
 * @returns {string}
 */
function normalizeReturnToPath(value, fallback = DEFAULT_RETURN_TO_PATH) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || !trimmedValue.startsWith("/") || trimmedValue.startsWith("//")) {
    return fallback;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmedValue, "http://localhost");
  } catch (_error) {
    return fallback;
  }

  const normalizedPathname =
    typeof parsedUrl.pathname === "string" && parsedUrl.pathname.trim()
      ? parsedUrl.pathname
      : "/";
  const normalizedPathnameLower = normalizedPathname.toLowerCase();

  if (
    DISALLOWED_RETURN_TO_PATHS.has(normalizedPathnameLower) ||
    normalizedPathnameLower.startsWith("/auth/")
  ) {
    return fallback;
  }

  return `${normalizedPathname}${parsedUrl.search}`;
}

/**
 * Builds one login/signin path with an optional `returnTo` query string.
 * @param {string} basePath
 * @param {string|null|undefined} returnTo
 * @param {string} [fallback]
 * @returns {string}
 */
function buildPathWithReturnTo(basePath, returnTo, fallback = DEFAULT_RETURN_TO_PATH) {
  const normalizedReturnTo = normalizeReturnToPath(returnTo, fallback);
  if (normalizedReturnTo === fallback) {
    return basePath;
  }

  return `${basePath}?returnTo=${encodeURIComponent(normalizedReturnTo)}`;
}

/**
 * Builds the app signin URL for one desired destination.
 * @param {string|null|undefined} returnTo
 * @param {string} [fallback]
 * @returns {string}
 */
function buildSigninPath(returnTo, fallback = DEFAULT_RETURN_TO_PATH) {
  return buildPathWithReturnTo("/signin", returnTo, fallback);
}

/**
 * Builds the auth-login URL for one desired destination.
 * @param {string|null|undefined} returnTo
 * @param {string} [fallback]
 * @returns {string}
 */
function buildAuthLoginPath(returnTo, fallback = DEFAULT_RETURN_TO_PATH) {
  return buildPathWithReturnTo("/auth/login", returnTo, fallback);
}

/**
 * Extracts the current in-app path and query string from one absolute request
 * URL for round-tripping through auth redirects.
 * @param {string|null|undefined} requestUrl
 * @param {string} [fallback]
 * @returns {string}
 */
function getReturnToFromRequestUrl(requestUrl, fallback = DEFAULT_RETURN_TO_PATH) {
  if (typeof requestUrl !== "string" || !requestUrl.trim()) {
    return fallback;
  }

  try {
    const parsedUrl = new URL(requestUrl);
    return normalizeReturnToPath(`${parsedUrl.pathname}${parsedUrl.search}`, fallback);
  } catch (_error) {
    return fallback;
  }
}

module.exports = {
  DEFAULT_RETURN_TO_PATH,
  buildAuthLoginPath,
  buildSigninPath,
  getReturnToFromRequestUrl,
  normalizeReturnToPath
};

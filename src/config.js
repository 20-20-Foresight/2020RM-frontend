const path = require("node:path");

/**
 * @typedef {Object} AppConfig
 * @property {number} port
 * @property {string} baseUrl
 * @property {boolean} authEnabled
 * @property {string} sessionSecret
 * @property {string} backendBaseUrl
 * @property {string} msTenantId
 * @property {string} msClientId
 * @property {string} msClientSecret
 * @property {string} msApiScope
 * @property {string} redirectPath
 * @property {{ firstName: string, lastName: string, email: string }} mockUser
 * @property {string} publicDir
 */

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function readBoolEnv(name, fallback) {
  const value = process.env[name];
  if (value == null) return fallback;
  return String(value).toLowerCase() === "true";
}

function readStringEnv(name, fallback) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return String(value);
}

function readIntEnv(name, fallback) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid integer env var: ${name}`);
  return parsed;
}

/**
 * Loads the application configuration.
 * @returns {AppConfig}
 */
function loadConfig() {
  const port = readIntEnv("PORT", 3000);
  const baseUrl = readStringEnv("BASE_URL", `http://localhost:${port}`);
  const authEnabled = readBoolEnv("AUTH_ENABLED", true);

  const sessionSecret = authEnabled
    ? requireEnv("SESSION_SECRET")
    : readStringEnv("SESSION_SECRET", "dev-session-secret");

  const backendBaseUrl = authEnabled
    ? requireEnv("BACKEND_BASE_URL")
    : readStringEnv("BACKEND_BASE_URL", "http://localhost:3001");

  const msTenantId = authEnabled ? requireEnv("MS_TENANT_ID") : readStringEnv("MS_TENANT_ID", "mock");
  const msClientId = authEnabled ? requireEnv("MS_CLIENT_ID") : readStringEnv("MS_CLIENT_ID", "mock");
  const msClientSecret = authEnabled
    ? requireEnv("MS_CLIENT_SECRET")
    : readStringEnv("MS_CLIENT_SECRET", "mock");
  const msApiScope = authEnabled ? requireEnv("MS_API_SCOPE") : readStringEnv("MS_API_SCOPE", "meta.read");

  const redirectPath = readStringEnv("MS_REDIRECT_PATH", "/auth/callback");

  const publicDir = readStringEnv("PUBLIC_DIR", path.resolve(__dirname, "../public"));

  const mockUser = {
    firstName: readStringEnv("AUTH_MOCK_USER_FIRST_NAME", "Test"),
    lastName: readStringEnv("AUTH_MOCK_USER_LAST_NAME", "User"),
    email: readStringEnv("AUTH_MOCK_USER_EMAIL", "test.user@example.com")
  };

  return {
    port,
    baseUrl,
    authEnabled,
    sessionSecret,
    backendBaseUrl,
    msTenantId,
    msClientId,
    msClientSecret,
    msApiScope,
    redirectPath,
    mockUser,
    publicDir
  };
}

module.exports = {
  loadConfig
};

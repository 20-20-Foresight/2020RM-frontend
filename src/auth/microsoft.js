const { Issuer, generators } = require("openid-client");

/** @type {import("openid-client").Client | null} */
let __client = null;

/**
 * @typedef {Object} MicrosoftAuthConfig
 * @property {string} tenantId
 * @property {string} clientId
 * @property {string} clientSecret
 * @property {string} redirectUri
 * @property {string} apiScope
 */

/**
 * @typedef {Object} SessionAuthState
 * @property {string} codeVerifier
 * @property {string} state
 * @property {string} nonce
 */

/**
 * @typedef {Object} MicrosoftUser
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 */

/**
 * Creates (or reuses) the OpenID client.
 * @param {MicrosoftAuthConfig} cfg
 * @returns {Promise<import("openid-client").Client>}
 */
async function getClient(cfg) {
  if (__client) return __client;

  const issuerUrl = `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/v2.0`;
  const issuer = await Issuer.discover(issuerUrl);

  __client = new issuer.Client({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uris: [cfg.redirectUri],
    response_types: ["code"]
  });

  return __client;
}

/**
 * Builds the Microsoft authorization URL and the state needed for callback validation.
 * @param {MicrosoftAuthConfig} cfg
 * @returns {Promise<{url: string, sessionState: SessionAuthState}>}
 */
async function buildAuthorizationUrl(cfg) {
  const client = await getClient(cfg);

  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  const nonce = generators.nonce();

  const url = client.authorizationUrl({
    scope: `openid profile email offline_access ${cfg.apiScope}`,
    response_mode: "query",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce
  });

  return {
    url,
    sessionState: { codeVerifier, state, nonce }
  };
}

/**
 * Extracts a basic user profile from ID token claims.
 * @param {Record<string, unknown>} claims
 * @returns {MicrosoftUser}
 */
function extractUserFromClaims(claims) {
  const name = typeof claims.name === "string" ? claims.name : "";
  const givenName = typeof claims.given_name === "string" ? claims.given_name : "";
  const familyName = typeof claims.family_name === "string" ? claims.family_name : "";

  const firstName =
    givenName ||
    (name ? name.split(" ").filter(Boolean).slice(0, 1).join(" ") : "") ||
    "";
  const lastName =
    familyName ||
    (name ? name.split(" ").filter(Boolean).slice(1).join(" ") : "") ||
    "";

  const email =
    (typeof claims.email === "string" && claims.email) ||
    (typeof claims.preferred_username === "string" && claims.preferred_username) ||
    (typeof claims.upn === "string" && claims.upn) ||
    "";

  return { firstName, lastName, email };
}

/**
 * Handles the OAuth callback by exchanging code for tokens and returning a user profile + token set.
 * @param {MicrosoftAuthConfig} cfg
 * @param {import("express").Request} req
 * @param {SessionAuthState} sessionState
 * @returns {Promise<{ user: MicrosoftUser, tokenSet: import("openid-client").TokenSet }>}
 */
async function handleCallback(cfg, req, sessionState) {
  const client = await getClient(cfg);
  const params = client.callbackParams(req);
  const tokenSet = await client.callback(cfg.redirectUri, params, {
    code_verifier: sessionState.codeVerifier,
    state: sessionState.state,
    nonce: sessionState.nonce
  });

  const claims = tokenSet.claims();
  const user = extractUserFromClaims(claims);
  return { user, tokenSet };
}

module.exports = {
  buildAuthorizationUrl,
  handleCallback
};

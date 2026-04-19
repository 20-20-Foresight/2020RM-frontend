const express = require("express");
const session = require("express-session");
const fs = require("node:fs");
const Logger = require("@20-20-Foresight/base/log");
const { buildAuthorizationUrl, handleCallback } = require("./auth/microsoft");
const {
  DEFAULT_RETURN_TO_PATH,
  buildSigninPath,
  normalizeReturnToPath
} = require("./auth/return-to");
const { getSessionStore } = require("./session/store");
const DEFAULT_FAVICON_PATH = "/assets/2020-ets-horiz-logo-rgb-color-lg.png";

/**
 * Returns whether the proxied request method can include a body.
 * @param {string|undefined} method
 * @returns {boolean}
 */
function canProxyRequestBody(method) {
  const normalizedMethod = typeof method === "string" ? method.toUpperCase() : "GET";
  return normalizedMethod !== "GET" && normalizedMethod !== "HEAD";
}

/**
 * Builds the fetch init for one backend proxy request.
 * @param {{
 *   method?: string,
 *   headers?: Record<string, string|string[]|undefined>,
 *   accessToken?: string|null
 * } & NodeJS.ReadableStream} req
 * @returns {RequestInit}
 */
function buildBackendProxyRequestInit(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (["host", "connection", "content-length", "accept-encoding", "cookie"].includes(lower)) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  if (req.accessToken) {
    headers.set("authorization", `Bearer ${req.accessToken}`);
  }

  /** @type {RequestInit} */
  const init = {
    method: req.method,
    headers,
    redirect: "manual"
  };

  if (canProxyRequestBody(req.method)) {
    init.body = req;
    init.duplex = "half";
  }

  return init;
}

/**
 * Returns the public favicon target for the frontend shell.
 * Prefer an explicit env override and otherwise fall back to the shared 2020 logo asset.
 *
 * @returns {string}
 */
function resolveFaviconTarget() {
  const explicitValue = process.env.FAVICON_URL;
  if (typeof explicitValue === "string" && explicitValue.trim()) {
    return explicitValue.trim();
  }

  return DEFAULT_FAVICON_PATH;
}

/**
 * Reads one JSON fixture payload from disk when configured for local tests.
 * @param {string} envName
 * @returns {object|null}
 */
function readJsonFixture(envName) {
  const fixturePath = process.env[envName];
  if (typeof fixturePath !== "string" || !fixturePath.trim()) {
    return null;
  }

  return JSON.parse(fs.readFileSync(fixturePath.trim(), "utf8"));
}

/**
 * Applies the admin-data fixture route's basic query filters.
 * This keeps the local visual harness closer to the real backend behavior.
 * @param {{items?: unknown[]}|null} fixture
 * @param {{type?: string, q?: string}} query
 * @returns {{items: unknown[]}}
 */
function filterAdminDataFixtureList(fixture, query = {}) {
  const items = Array.isArray(fixture?.items) ? fixture.items : [];
  const normalizedType = typeof query.type === "string" ? query.type.trim().toLowerCase() : "";
  const normalizedQuery = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";

  return {
    items: items.filter((item) => {
      if (normalizedType) {
        const itemType = typeof item?.type === "string" ? item.type.trim().toLowerCase() : "";
        if (itemType !== normalizedType) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        item?.name,
        item?.description,
        item?.key,
        item?.type,
        item?.namespace,
        item?.id
      ]
        .filter((value) => typeof value === "string" && value.trim())
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
  };
}

/**
 * @typedef {import("./config").AppConfig} AppConfig
 */

/**
 * @param {AppConfig} config
 * @param {import("@remix-run/express").RequestHandler} [remixHandler]
 * @param {{
 *   buildAuthorizationUrl?: typeof buildAuthorizationUrl,
 *   handleCallback?: typeof handleCallback
 * }} [deps]
 * @returns {import("express").Express}
 */
function createApp(config, remixHandler, deps = {}) {
  const app = express();
  const log = new Logger("frontend", "app");
  const buildAuthorizationUrlImpl =
    typeof deps.buildAuthorizationUrl === "function"
      ? deps.buildAuthorizationUrl
      : buildAuthorizationUrl;
  const handleCallbackImpl =
    typeof deps.handleCallback === "function" ? deps.handleCallback : handleCallback;
  const faviconTarget = resolveFaviconTarget();
  const adminDataListFixture = readJsonFixture("ADMIN_DATA_LIST_FIXTURE_PATH");
  const adminDataDetailFixture = readJsonFixture("ADMIN_DATA_DETAIL_FIXTURE_PATH");
  const organizationDetailFixture = readJsonFixture("ORGANIZATION_DETAIL_FIXTURE_PATH");
  const organizationPeopleFixture = readJsonFixture("ORGANIZATION_PEOPLE_FIXTURE_PATH");

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    session({
      name: "2020rm.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: getSessionStore(),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false
      }
    })
  );

  /**
   * Attaches req.user (and req.accessToken) if authenticated.
   * In mock mode, sets mock user.
   * @type {import("express").RequestHandler}
   */
  const requireSessionAuth = (req, res, next) => {
    if (!config.authEnabled) {
      req.user = config.mockUser;
      req.accessToken = null;
      log.info("mock auth enabled; bypassing token check");
      return next();
    }

    const sessionData = req.session || {};
    if (!sessionData.user || !sessionData.tokens || !sessionData.tokens.accessToken) {
      log.warn("missing session user/tokens", {
        hasSession: Boolean(req.session),
        hasUser: Boolean(sessionData.user),
        hasTokens: Boolean(sessionData.tokens),
        hasAccessToken: Boolean(sessionData.tokens && sessionData.tokens.accessToken)
      });
      return res.status(401).json({ error: "not_authenticated" });
    }

    req.user = sessionData.user;
    req.accessToken = sessionData.tokens.accessToken;
    log.info("session authenticated", {
      userEmail: sessionData.user && sessionData.user.email ? sessionData.user.email : "unknown",
      scope: sessionData.tokens.scope || ""
    });
    return next();
  };

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/favicon.ico", (_req, res) => {
    res.redirect(302, faviconTarget);
  });

  if (adminDataListFixture || adminDataDetailFixture) {
    app.get("/api/rest/admin/data", (req, res, next) => {
      if (!adminDataListFixture) {
        return next();
      }

      return res.json(
        filterAdminDataFixtureList(adminDataListFixture, {
          type: typeof req.query?.type === "string" ? req.query.type : "",
          q: typeof req.query?.q === "string" ? req.query.q : ""
        })
      );
    });

    app.get("/api/rest/admin/data/:dataId", (req, res, next) => {
      if (!adminDataDetailFixture) {
        return next();
      }

      const requestedId = decodeURIComponent(req.params.dataId || "");
      const detailMap = adminDataDetailFixture && typeof adminDataDetailFixture === "object"
        ? adminDataDetailFixture
        : {};
      const payload = detailMap[requestedId];

      if (!payload) {
        return res.status(404).json({
          error: {
            message: `Fixture data not found for ${requestedId}`
          }
        });
      }

      return res.json(payload);
    });
  }

  if (organizationPeopleFixture || organizationDetailFixture) {
    app.get("/api/rest/organization/:organizationId/people", (req, res, next) => {
      if (!organizationPeopleFixture) {
        return next();
      }

      const requestedId = decodeURIComponent(req.params.organizationId || "");
      const payload = organizationPeopleFixture && typeof organizationPeopleFixture === "object"
        ? organizationPeopleFixture[requestedId]
        : null;

      if (!payload) {
        return res.status(404).json({
          message: `Fixture people data not found for ${requestedId}`
        });
      }

      return res.json(payload);
    });

    app.get("/api/rest/organization/:organizationId", (req, res, next) => {
      if (!organizationDetailFixture) {
        return next();
      }

      const requestedId = decodeURIComponent(req.params.organizationId || "");
      const payload = organizationDetailFixture && typeof organizationDetailFixture === "object"
        ? organizationDetailFixture[requestedId]
        : null;

      if (!payload) {
        return res.status(404).json({
          message: `Fixture organization data not found for ${requestedId}`
        });
      }

      return res.json(payload);
    });
  }

  app.get("/auth/login", async (req, res, next) => {
    try {
      const returnTo = normalizeReturnToPath(
        typeof req.query?.returnTo === "string" ? req.query.returnTo : DEFAULT_RETURN_TO_PATH
      );

      if (!config.authEnabled) {
        req.session.user = config.mockUser;
        req.session.tokens = { accessToken: null, refreshToken: null, expiresAt: null, scope: "" };
        return res.redirect(returnTo);
      }

      log.info("/auth/login start");
      const redirectUri = `${config.baseUrl}${config.redirectPath}`;
      const { url, sessionState } = await buildAuthorizationUrlImpl({
        tenantId: config.msTenantId,
        clientId: config.msClientId,
        clientSecret: config.msClientSecret,
        redirectUri,
        apiScope: config.msApiScope
      });

      req.session.msAuth = {
        ...sessionState,
        returnTo
      };
      log.info("redirecting to Microsoft auth");
      return res.redirect(url);
    } catch (err) {
      log.error("/auth/login error", err);
      return next(err);
    }
  });

  app.get(config.redirectPath, async (req, res, next) => {
    try {
      if (!config.authEnabled) return res.redirect("/dashboard");

      const sessionState = req.session.msAuth;
      if (
        !sessionState ||
        typeof sessionState.codeVerifier !== "string" ||
        typeof sessionState.state !== "string" ||
        typeof sessionState.nonce !== "string"
      ) {
        log.error("missing auth session state");
        return res.status(400).send("Missing auth session state.");
      }

      const redirectUri = `${config.baseUrl}${config.redirectPath}`;
      const { user, tokenSet } = await handleCallbackImpl(
        {
          tenantId: config.msTenantId,
          clientId: config.msClientId,
          clientSecret: config.msClientSecret,
          redirectUri,
          apiScope: config.msApiScope
        },
        req,
        sessionState
      );
      const returnTo = normalizeReturnToPath(sessionState.returnTo);

      req.session.user = user;
      req.session.tokens = {
        accessToken: tokenSet.access_token || null,
        refreshToken: tokenSet.refresh_token || null,
        expiresAt: tokenSet.expires_at || null,
        scope: tokenSet.scope || ""
      };
      delete req.session.msAuth;
      log.info("auth callback success", {
        returnTo
      });
      return res.redirect(returnTo);
    } catch (err) {
      log.error("auth callback error", err);
      return next(err);
    }
  });

  app.get("/auth/logout", (req, res) => {
    const logoutUrl = config.authEnabled
      ? `https://login.microsoftonline.com/${encodeURIComponent(config.msTenantId)}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(`${config.baseUrl}/signin.html`)}`
      : "/signin.html";

    req.session.destroy(() => {
      res.redirect(logoutUrl);
    });
  });

  app.use("/api", requireSessionAuth, async (req, res) => {
    try {
      // Preserve the full API path when proxying to backend.
      const backendPath = req.originalUrl || "/";
      const target = new URL(backendPath, config.backendBaseUrl);
      const backendRes = await fetch(target, buildBackendProxyRequestInit(req));

      if (backendRes.status >= 500) {
        log.error("api proxy upstream server error", {
          method: req.method,
          path: backendPath,
          status: backendRes.status,
          userEmail: req.user?.email || "unknown"
        });
      } else if (backendRes.status >= 400) {
        log.warn("api proxy upstream client error", {
          method: req.method,
          path: backendPath,
          status: backendRes.status,
          userEmail: req.user?.email || "unknown"
        });
      }

      res.status(backendRes.status);
      backendRes.headers.forEach((value, key) => {
        if (["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) return;
        res.setHeader(key, value);
      });

      const buffer = Buffer.from(await backendRes.arrayBuffer());
      return res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "proxy_error";
      log.error("api proxy error", {
        method: req.method,
        path: req.originalUrl || "/",
        userEmail: req.user?.email || "unknown",
        message
      });
      return res.status(502).json({ error: "proxy_error", message });
    }
  });

  // Page auth guard (Remix-rendered routes).
  app.use((req, res, next) => {
    const path = req.path.toLowerCase();
    const allowList = [
      "/signin",
      "/signin.html",
      "/auth/login",
      "/auth/callback",
      "/auth/logout",
      "/health",
      "/assets",
      "/favicon.ico"
    ];
    if (allowList.some((allowed) => path.startsWith(allowed))) return next();
    if (path.startsWith("/api")) return next();
    if (!config.authEnabled) {
      req.user = config.mockUser;
      req.accessToken = null;
      return next();
    }
    const sessionData = req.session || {};
    if (!sessionData.user || !sessionData.tokens || !sessionData.tokens.accessToken) {
      return res.redirect(buildSigninPath(req.originalUrl || req.url || DEFAULT_RETURN_TO_PATH));
    }
    return next();
  });

  app.use(express.static(config.publicDir));

  if (remixHandler) {
    app.all("*", remixHandler);
  }

  app.use((_req, res) => {
    res.status(404).send("Not Found");
  });

  app.use((err, _req, res, _next) => {
    log.error("server_error", err instanceof Error ? err.stack || err.message : err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "server_error", message });
  });

  return app;
}

module.exports = {
  buildBackendProxyRequestInit,
  createApp,
  filterAdminDataFixtureList,
  resolveFaviconTarget
};

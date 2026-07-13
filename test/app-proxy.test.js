const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { PassThrough } = require("node:stream");

const {
  authenticateRequestSession,
  buildBackendProxyRequestInit,
  createApp,
  filterAdminDataFixtureList,
  isAccessTokenExpired,
  resolveFaviconTarget
} = require("../src/app");

function createConfig(overrides = {}) {
  return {
    port: 3000,
    baseUrl: "http://127.0.0.1:3000",
    authEnabled: true,
    sessionSecret: "test-session-secret",
    backendBaseUrl: "http://127.0.0.1:3001",
    msTenantId: "tenant-id",
    msClientId: "client-id",
    msClientSecret: "client-secret",
    msApiScope: "api://crm/.default",
    redirectPath: "/auth/callback",
    mockUser: {
      firstName: "Test",
      lastName: "User",
      email: "test.user@example.com"
    },
    publicDir: path.join(os.tmpdir(), "crm-frontend-public"),
    ...overrides
  };
}

function createTestLogger() {
  return {
    info() {},
    warn() {},
    error() {}
  };
}

test("frontend proxy request builder forwards POST bodies and content headers", async () => {
  const requestStream = new PassThrough();
  const request = Object.assign(requestStream, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "sid=123"
    },
    accessToken: "access-token-1"
  });

  requestStream.end(
    JSON.stringify({
      mode: "sync-required",
      actions: [
        {
          name: "dataList",
          action: "data/list"
        }
      ]
    })
  );

  const options = buildBackendProxyRequestInit(request);

  assert.equal(options.method, "POST");
  assert.equal(options.redirect, "manual");
  assert.equal(options.duplex, "half");
  assert.equal(options.headers.get("content-type"), "application/json");
  assert.equal(options.headers.get("authorization"), "Bearer access-token-1");
  assert.equal(options.headers.get("cookie"), null);

  const chunks = [];
  for await (const chunk of options.body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString("utf8")), {
    mode: "sync-required",
    actions: [
      {
        name: "dataList",
        action: "data/list"
      }
    ]
  });
});

test("resolveFaviconTarget falls back to the shared 2020 logo asset", () => {
  const originalValue = process.env.FAVICON_URL;
  delete process.env.FAVICON_URL;

  try {
    assert.equal(resolveFaviconTarget(), "/assets/2020-ets-horiz-logo-rgb-color-lg.png");
  } finally {
    if (originalValue == null) {
      delete process.env.FAVICON_URL;
    } else {
      process.env.FAVICON_URL = originalValue;
    }
  }
});

test("resolveFaviconTarget prefers an explicit env override", () => {
  const originalValue = process.env.FAVICON_URL;
  process.env.FAVICON_URL = "https://2020foresight.com/favicon.ico";

  try {
    assert.equal(resolveFaviconTarget(), "https://2020foresight.com/favicon.ico");
  } finally {
    if (originalValue == null) {
      delete process.env.FAVICON_URL;
    } else {
      process.env.FAVICON_URL = originalValue;
    }
  }
});

test("filterAdminDataFixtureList narrows the admin data fixture by type and search text", () => {
  const fixture = {
    items: [
      {
        id: "crm.data:focus",
        type: "categories",
        key: "focus",
        name: "Focus",
        description: "Focus categories"
      },
      {
        id: "crm.data:dimension-definitions",
        type: "dimension-definition",
        key: "dimension-definitions",
        name: "Dimension Definitions",
        description: "Dimension catalog"
      }
    ]
  };

  assert.deepEqual(
    filterAdminDataFixtureList(fixture, {
      type: "dimension-definition",
      q: "dimension"
    }),
    {
      items: [
        {
          id: "crm.data:dimension-definitions",
          type: "dimension-definition",
          key: "dimension-definitions",
          name: "Dimension Definitions",
          description: "Dimension catalog"
        }
      ]
    }
  );
});

test("isAccessTokenExpired respects expiry timestamps with a refresh skew", () => {
  assert.equal(
    isAccessTokenExpired(
      {
        accessToken: "token-1",
        expiresAt: 1600
      },
      1000
    ),
    false
  );

  assert.equal(
    isAccessTokenExpired(
      {
        accessToken: "token-1",
        expiresAt: 1059
      },
      1000
    ),
    true
  );
});

test("authenticateRequestSession refreshes expired access tokens", async () => {
  const req = {
    session: {
      user: {
        email: "ada@example.com"
      },
      tokens: {
        accessToken: "expired-access-token",
        refreshToken: "refresh-token-1",
        expiresAt: 1000,
        scope: "scope-1"
      }
    }
  };

  const result = await authenticateRequestSession(req, {
    config: createConfig(),
    log: createTestLogger(),
    nowSeconds: 2000,
    refreshTokenSetImpl: async (cfg, refreshToken) => {
      assert.equal(cfg.redirectUri, "http://127.0.0.1:3000/auth/callback");
      assert.equal(refreshToken, "refresh-token-1");
      return {
        access_token: "fresh-access-token",
        refresh_token: "refresh-token-2",
        expires_at: 3600,
        scope: "scope-2"
      };
    }
  });

  assert.deepEqual(result, {
    authenticated: true,
    refreshed: true
  });
  assert.equal(req.accessToken, "fresh-access-token");
  assert.equal(req.session.tokens.accessToken, "fresh-access-token");
  assert.equal(req.session.tokens.refreshToken, "refresh-token-2");
  assert.equal(req.session.tokens.expiresAt, 3600);
  assert.equal(req.session.tokens.scope, "scope-2");
});

test("authenticateRequestSession clears auth state when token refresh fails", async () => {
  const req = {
    session: {
      user: {
        email: "ada@example.com"
      },
      tokens: {
        accessToken: "expired-access-token",
        refreshToken: "refresh-token-1",
        expiresAt: 1000,
        scope: "scope-1"
      },
      msAuth: {
        state: "stale"
      }
    }
  };

  const result = await authenticateRequestSession(req, {
    config: createConfig(),
    log: createTestLogger(),
    nowSeconds: 2000,
    refreshTokenSetImpl: async () => {
      throw new Error("exp is expired");
    }
  });

  assert.deepEqual(result, {
    authenticated: false,
    refreshed: false,
    reason: "refresh_failed"
  });
  assert.equal(req.session.user, undefined);
  assert.equal(req.session.tokens, undefined);
  assert.equal(req.session.msAuth, undefined);
});

test("public build assets stay accessible without an authenticated session", async () => {
  const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-frontend-public-"));
  const buildDir = path.join(publicDir, "build");
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, "app.css"), "body{color:red;}", "utf8");

  const app = createApp(
    createConfig({
      publicDir
    }),
    (_req, res) => {
      res.status(200).send("remix");
    }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;

    const assetResponse = await fetch(`${origin}/build/app.css`, {
      redirect: "manual"
    });
    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get("content-type") || "", /text\/css/);
    assert.equal(await assetResponse.text(), "body{color:red;}");

    const dashboardResponse = await fetch(`${origin}/dashboard`, {
      redirect: "manual"
    });
    assert.equal(dashboardResponse.status, 302);
    assert.equal(dashboardResponse.headers.get("location"), "/signin");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
});

test("app-only logout clears the local session without redirecting through Microsoft", async () => {
  const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-frontend-public-"));
  fs.mkdirSync(path.join(publicDir, "build"), { recursive: true });

  const app = createApp(
    createConfig({
      publicDir
    }),
    (_req, res) => {
      res.status(200).send("remix");
    }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${origin}/auth/app-logout`, {
      redirect: "manual"
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/signin.html");

    const authLogoutResponse = await fetch(`${origin}/auth/logout`, {
      redirect: "manual"
    });

    assert.equal(authLogoutResponse.status, 302);
    assert.equal(authLogoutResponse.headers.get("location"), "/signin.html");

    const signoutResponse = await fetch(`${origin}/signout`, {
      redirect: "manual"
    });

    assert.equal(signoutResponse.status, 302);
    assert.equal(signoutResponse.headers.get("location"), "/signin.html");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
});

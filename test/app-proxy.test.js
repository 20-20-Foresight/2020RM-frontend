const test = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");

const {
  buildBackendProxyRequestInit,
  filterAdminDataFixtureList,
  resolveBackendProxyPath,
  resolveFaviconTarget
} = require("../src/app");

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

test("resolveBackendProxyPath maps frontend api rpc paths to the backend rpc app", () => {
  assert.equal(resolveBackendProxyPath("/api/rpc"), "/rpc");
  assert.equal(
    resolveBackendProxyPath("/api/rpc/request/request-1/events?tail=1"),
    "/rpc/request/request-1/events?tail=1"
  );
  assert.equal(
    resolveBackendProxyPath("/api/rest/admin/data?type=segmentation"),
    "/api/rest/admin/data?type=segmentation"
  );
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

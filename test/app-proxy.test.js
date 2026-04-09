const test = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");

const { buildBackendProxyRequestInit } = require("../src/app");

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

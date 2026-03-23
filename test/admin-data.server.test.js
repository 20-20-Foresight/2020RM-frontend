const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadAdminDataList,
  loadAdminDataDocument,
  saveAdminDataDocument,
  buildDocumentFromEditor
} = require("../app/models/admin-data.server");

test("admin data list loader calls the normalized admin data REST route", async () => {
  const calls = [];
  const rows = await loadAdminDataList({
    request: new Request("http://localhost:3000/admin/data", {
      headers: {
        cookie: "sid=123"
      }
    }),
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            items: [
              {
                namespace: "crm.data",
                key: "nicknames",
                name: "Nicknames",
                description: "Nickname crosswalk for person matching",
                lastmodifieddate: "2026-03-23T12:30:00.000Z",
                lastmodifiedby: "admin@example.com"
              }
            ]
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/admin/data");
  assert.equal(calls[0].options.method, undefined);
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(rows, [
    {
      id: "crm.data:nicknames",
      namespace: "crm.data",
      key: "nicknames",
      name: "Nicknames",
      description: "Nickname crosswalk for person matching",
      shape: null,
      version: null,
      lastmodifieddate: "2026-03-23T12:30:00.000Z",
      lastmodifiedby: "admin@example.com",
      status: null
    }
  ]);
});

test("admin data detail loader calls the normalized admin data detail route", async () => {
  const calls = [];
  const detail = await loadAdminDataDocument({
    request: new Request("http://localhost:3000/admin/data/crm.data%3Anicknames", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: "crm.data:nicknames",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            data: {
              id: "crm.data:nicknames",
              namespace: "crm.data",
              key: "nicknames",
              name: "Nicknames",
              description: "Nickname crosswalk for person matching",
              shape: "crosswalk",
              version: 4,
              lastmodifieddate: "2026-03-23T12:30:00.000Z",
              lastmodifiedby: "admin@example.com",
              document: {
                crosswalk: {
                  bob: {
                    values: ["robert"]
                  }
                }
              },
              editor: {
                columns: ["source", "target"],
                rows: [
                  {
                    source: "bob",
                    target: "robert"
                  }
                ]
              }
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/admin/data/crm.data%3Anicknames");
  assert.equal(calls[0].options.method, undefined);
  assert.deepEqual(detail, {
    id: "crm.data:nicknames",
    namespace: "crm.data",
    key: "nicknames",
    name: "Nicknames",
    description: "Nickname crosswalk for person matching",
    shape: "crosswalk",
    version: 4,
    lastmodifieddate: "2026-03-23T12:30:00.000Z",
    lastmodifiedby: "admin@example.com",
    status: null,
    document: {
      crosswalk: {
        bob: {
          values: ["robert"]
        }
      }
    },
    editor: {
      columns: ["source", "target"],
      rows: [
        {
          source: "bob",
          target: "robert"
        }
      ]
    }
  });
});

test("buildDocumentFromEditor rewrites crosswalk rows into the canonical document shape", () => {
  assert.deepEqual(
    buildDocumentFromEditor({
      shape: "crosswalk",
      columns: ["source", "target"],
      rows: [
        {
          source: "bob",
          target: "robert"
        },
        {
          source: "bob",
          target: "bobby"
        },
        {
          source: "liz",
          target: "elizabeth"
        },
        {
          source: "   ",
          target: "ignored"
        },
        {
          source: "bob",
          target: "robert"
        }
      ],
      document: {
        crosswalk: {}
      }
    }),
    {
      crosswalk: {
        bob: {
          values: ["robert", "bobby"]
        },
        liz: {
          values: ["elizabeth"]
        }
      }
    }
  );
});

test("buildDocumentFromEditor preserves one-property wrappers for list and keyvalue shapes", () => {
  assert.deepEqual(
    buildDocumentFromEditor({
      shape: "list",
      columns: ["value"],
      rows: [
        {
          value: "one"
        },
        {
          value: "two"
        },
        {
          value: "   "
        }
      ],
      document: {
        values: ["old"]
      }
    }),
    {
      values: ["one", "two"]
    }
  );

  assert.deepEqual(
    buildDocumentFromEditor({
      shape: "keyvalue",
      columns: ["key", "value"],
      rows: [
        {
          key: "bob",
          value: "robert"
        },
        {
          key: "liz",
          value: "elizabeth"
        }
      ],
      document: {
        entries: {
          old: "value"
        }
      }
    }),
    {
      entries: {
        bob: "robert",
        liz: "elizabeth"
      }
    }
  );
});

test("admin data save calls the normalized admin data save route with the rebuilt document and editor payload", async () => {
  const calls = [];
  const saved = await saveAdminDataDocument({
    request: new Request("http://localhost:3000/admin/data/crm.data%3Anicknames", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: "crm.data:nicknames",
    description: "Nickname crosswalk for person matching",
    expectedVersion: 4,
    shape: "crosswalk",
    columns: ["source", "target"],
    rows: [
      {
        source: "bob",
        target: "robert"
      },
      {
        source: "liz",
        target: "elizabeth"
      }
    ],
    document: {
      crosswalk: {}
    },
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            data: {
              id: "crm.data:nicknames",
              namespace: "crm.data",
              key: "nicknames",
              name: "Nicknames",
              description: "Nickname crosswalk for person matching",
              version: 5,
              lastmodifieddate: "2026-03-23T12:45:00.000Z",
              lastmodifiedby: "admin@example.com",
              status: "active"
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/admin/data/crm.data%3Anicknames");
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(calls[0].options.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    description: "Nickname crosswalk for person matching",
    expectedVersion: 4,
    document: {
      crosswalk: {
        bob: {
          values: ["robert"]
        },
        liz: {
          values: ["elizabeth"]
        }
      }
    },
    editor: {
      shape: "crosswalk",
      columns: ["source", "target"],
      rows: [
        {
          source: "bob",
          target: "robert"
        },
        {
          source: "liz",
          target: "elizabeth"
        }
      ]
    }
  });
  assert.deepEqual(saved, {
    id: "crm.data:nicknames",
    namespace: "crm.data",
    key: "nicknames",
    name: "Nicknames",
    description: "Nickname crosswalk for person matching",
    shape: null,
    version: 5,
    lastmodifieddate: "2026-03-23T12:45:00.000Z",
    lastmodifiedby: "admin@example.com",
    status: "active"
  });
});

test("admin data save surfaces handled upstream errors with status information", async () => {
  await assert.rejects(
    () =>
      saveAdminDataDocument({
        request: new Request("http://localhost:3000/admin/data/crm.data%3Anicknames"),
        id: "crm.data:nicknames",
        expectedVersion: 4,
        shape: "crosswalk",
        columns: ["source", "target"],
        rows: [],
        document: {
          crosswalk: {}
        },
        fetchImpl: async () => ({
          ok: false,
          status: 409,
          async json() {
            return {
              error: {
                code: "version_conflict",
                message: "Data changed underneath you."
              }
            };
          }
        })
      }),
    (error) => {
      assert.equal(error.name, "AdminDataApiError");
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "version_conflict");
      assert.equal(error.message, "Data changed underneath you.");
      return true;
    }
  );
});

test("admin data list includes the HTTP status in the error when the REST route is missing", async () => {
  await assert.rejects(
    () =>
      loadAdminDataList({
        request: new Request("http://localhost:3000/admin/data"),
        fetchImpl: async () => ({
          ok: false,
          status: 404,
          async json() {
            throw new Error("not json");
          }
        })
      }),
    (error) => {
      assert.equal(error.name, "AdminDataApiError");
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, "Admin data request failed (HTTP 404).");
      return true;
    }
  );
});

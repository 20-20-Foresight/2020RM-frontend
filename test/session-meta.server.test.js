const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadSessionMeta } = require("../app/models/session-meta.server");

test("session meta loader calls /api/meta with the incoming cookie header", async () => {
  const calls = [];
  const meta = await loadSessionMeta({
    request: new Request("http://localhost:3000/dashboard", {
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
        status: 200,
        ok: true,
        async json() {
          return {
            user: {
              id: "usr_1",
              firstName: "Ada",
              lastName: "Lovelace",
              email: "ada@example.com",
              status: "active"
            },
            blocked: false,
            blockers: [],
            personas: {
              allowed: ["recruiter"],
              current: "recruiter",
              default: "recruiter"
            },
            permissions: {
              entity_access: {
                organization: ["read"]
              },
              options_access: {},
              admin_access: {}
            },
            links: {
              localPersonId: "person-1",
              rpcPersonId: null
            },
            ghost: {
              active: false,
              actorUserId: null,
              effectiveUserId: null
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/meta");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(meta.blocked, false);
  assert.equal(meta.user.email, "ada@example.com");
});

test("session meta loader returns a signin redirect marker on 401", async () => {
  const meta = await loadSessionMeta({
    request: new Request("http://localhost:3000/dashboard"),
    fetchImpl: async () => ({
      status: 401,
      ok: false,
      async json() {
        return { error: "not_authenticated" };
      }
    })
  });

  assert.deepEqual(meta, {
    redirectToSignin: true
  });
});

test("session meta loader can read a local fixture when SESSION_META_FIXTURE_PATH is set", async () => {
  const fixturePath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "crm-session-meta-")),
    "meta.json"
  );
  const originalFixturePath = process.env.SESSION_META_FIXTURE_PATH;

  fs.writeFileSync(
    fixturePath,
    JSON.stringify({
      user: {
        firstName: "Dan",
        lastName: "Morgan",
        email: "dan@example.com"
      },
      blocked: false,
      personas: {
        current: "Admin"
      },
      permissions: {
        admin_access: {
          system: ["access_control", "object_editing"]
        }
      }
    }),
    "utf8"
  );

  process.env.SESSION_META_FIXTURE_PATH = fixturePath;

  try {
    const meta = await loadSessionMeta({
      request: new Request("http://localhost:3000/dashboard"),
      fetchImpl: async () => {
        throw new Error("fetch should not be called when a session meta fixture is configured");
      }
    });

    assert.equal(meta.user.email, "dan@example.com");
    assert.equal(meta.blocked, false);
    assert.equal(meta.personas.current, "Admin");
  } finally {
    if (originalFixturePath == null) {
      delete process.env.SESSION_META_FIXTURE_PATH;
    } else {
      process.env.SESSION_META_FIXTURE_PATH = originalFixturePath;
    }

    fs.rmSync(path.dirname(fixturePath), { recursive: true, force: true });
  }
});

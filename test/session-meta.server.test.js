const test = require("node:test");
const assert = require("node:assert/strict");

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

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadAccessControlPage,
  loadRoleManagementPage
} = require("../app/models/access-control.server");

test("access control loader fetches users and roles through the BFF", async () => {
  const calls = [];
  const result = await loadAccessControlPage({
    request: new Request("http://localhost:3000/admin/user-management", {
      headers: {
        cookie: "sid=123"
      }
    }),
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      if (String(url).endsWith("/api/admin/access/roles")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              roles: [
                {
                  key: "recruiter_internal",
                  label: "Recruiter Internal",
                  permissions: [],
                  userCount: 0
                }
              ]
            };
          }
        };
      }

      if (String(url).endsWith("/api/admin/access/permissions")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              personas: [
                {
                  key: "recruiter",
                  label: "Recruiter"
                }
              ]
            };
          }
        };
      }

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            users: [
              {
                id: "usr_1",
                firstName: "Ada",
                lastName: "Lovelace",
                email: "ada@example.com",
                status: "pending_access",
                defaultPersonaKey: "recruiter",
                roleKeys: [],
                localPersonId: null,
                rpcPersonId: null
              }
            ]
          };
        }
      };
    }
  });

  assert.deepEqual(calls.map((call) => call.url), [
    "http://localhost:3000/api/admin/access/roles",
    "http://localhost:3000/api/admin/access/users",
    "http://localhost:3000/api/admin/access/permissions"
  ]);
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(result, {
    roles: [
      {
        key: "recruiter_internal",
        label: "Recruiter Internal",
        permissions: [],
        userCount: 0
      }
    ],
    users: [
      {
        id: "usr_1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        status: "pending_access",
        defaultPersonaKey: "recruiter",
        roleKeys: [],
        localPersonId: null,
        rpcPersonId: null
      }
    ],
    personas: [
      {
        key: "recruiter",
        label: "Recruiter"
      }
    ],
    error: null
  });
});

test("access control loader returns an error payload when the BFF rejects the request", async () => {
  const result = await loadAccessControlPage({
    request: new Request("http://localhost:3000/admin/user-management"),
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      async json() {
        return {
          error: "forbidden"
        };
      }
    })
  });

  assert.deepEqual(result, {
    roles: [],
    users: [],
    personas: [],
    error: "forbidden"
  });
});

test("role management loader fetches roles and permission sections through the BFF", async () => {
  const calls = [];
  const result = await loadRoleManagementPage({
    request: new Request("http://localhost:3000/admin/roles", {
      headers: {
        cookie: "sid=123"
      }
    }),
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      if (String(url).endsWith("/api/admin/access/permissions")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              sections: [
                {
                  category: "tools_access",
                  label: "Tools Permissions",
                  items: []
                }
              ],
              personas: [
                {
                  key: "es_client",
                  label: "ES Client"
                }
              ]
            };
          }
        };
      }

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            roles: [
              {
                key: "research_manager",
                label: "Research Manager",
                permissions: [],
                userCount: 1
              }
            ]
          };
        }
      };
    }
  });

  assert.deepEqual(calls.map((call) => call.url), [
    "http://localhost:3000/api/admin/access/roles",
    "http://localhost:3000/api/admin/access/permissions"
  ]);
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(result, {
    roles: [
      {
        key: "research_manager",
        label: "Research Manager",
        permissions: [],
        userCount: 1
      }
    ],
    sections: [
      {
        category: "tools_access",
        label: "Tools Permissions",
        items: []
      }
    ],
    personas: [
      {
        key: "es_client",
        label: "ES Client"
      }
    ],
    error: null
  });
});

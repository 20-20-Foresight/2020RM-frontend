const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AccessRoleMutationApiError,
  createAccessRole
} = require("../app/models/access-role-mutations.server");

test("access role mutation proxies the create payload through the BFF", async () => {
  const calls = [];
  const formData = new FormData();
  formData.set("key", "research_manager");
  formData.set("label", "Research Manager");
  formData.set("description", "Can use Company Research");
  formData.append("permissionKeys", "tools_access:company_research:access");
  formData.append("permissionKeys", "admin_access:configuration:access");

  const role = await createAccessRole({
    request: new Request("http://localhost:3000/admin/roles", {
      headers: {
        cookie: "sid=123"
      }
    }),
    formData,
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });
      return {
        ok: true,
        status: 201,
        async json() {
          return {
            role: {
              key: "research_manager",
              label: "Research Manager"
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/admin/access/roles");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    key: "research_manager",
    label: "Research Manager",
    description: "Can use Company Research",
    permissions: [
      { category: "tools_access", target: "company_research", action: "access" },
      { category: "admin_access", target: "configuration", action: "access" }
    ]
  });
  assert.deepEqual(role, {
    key: "research_manager",
    label: "Research Manager"
  });
});

test("access role mutation normalizes backend failures", async () => {
  const formData = new FormData();
  formData.set("key", "research_manager");
  formData.set("label", "Research Manager");

  await assert.rejects(
    () =>
      createAccessRole({
        request: new Request("http://localhost:3000/admin/roles"),
        formData,
        fetchImpl: async () => ({
          ok: false,
          status: 400,
          async json() {
            return {
              error: "invalid_role_create",
              message: "Select at least one permission for the role."
            };
          }
        })
      }),
    (error) => {
      assert.ok(error instanceof AccessRoleMutationApiError);
      assert.equal(error.code, "invalid_role_create");
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, "Select at least one permission for the role.");
      return true;
    }
  );
});

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AccessControlMutationApiError,
  createAccessControlUser,
  createAccessControlLocalPerson,
  startGhostSession,
  updateAccessControlUser
} = require("../app/models/access-control-mutations.server");

test("access control user mutation proxies the edit payload through the BFF", async () => {
  const calls = [];
  const formData = new FormData();
  formData.set("userId", "usr_1");
  formData.set("status", "active");
  formData.set("defaultPersonaKey", "recruiter");
  formData.set("localPersonId", "person-1");
  formData.set("rpcPersonId", "rpc-1");
  formData.append("roleKeys", "ops_admin");
  formData.append("roleKeys", "recruiter_internal");

  const user = await updateAccessControlUser({
    request: new Request("http://localhost:3000/admin/user-management", {
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
        status: 200,
        async json() {
          return {
            user: {
              id: "usr_1",
              status: "active"
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/admin/access/users/usr_1");
  assert.equal(calls[0].options.method, "PATCH");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    status: "active",
    roleKeys: ["ops_admin", "recruiter_internal"],
    defaultPersonaKey: "recruiter",
    localPersonId: "person-1",
    rpcPersonId: "rpc-1"
  });
  assert.deepEqual(user, {
    id: "usr_1",
    status: "active"
  });
});

test("access control user mutation normalizes backend failures", async () => {
  const formData = new FormData();
  formData.set("userId", "usr_1");
  formData.set("status", "active");

  await assert.rejects(
    () =>
      updateAccessControlUser({
        request: new Request("http://localhost:3000/admin/user-management"),
        formData,
        fetchImpl: async () => ({
          ok: false,
          status: 400,
          async json() {
            return {
              error: "invalid_user_update",
              message: "Cannot activate a user without at least one role."
            };
          }
        })
      }),
    (error) => {
      assert.ok(error instanceof AccessControlMutationApiError);
      assert.equal(error.code, "invalid_user_update");
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, "Cannot activate a user without at least one role.");
      return true;
    }
  );
});

test("access control user mutation explains when the backend route is missing", async () => {
  const formData = new FormData();
  formData.set("userId", "usr_1");
  formData.set("status", "active");

  await assert.rejects(
    () =>
      updateAccessControlUser({
        request: new Request("http://localhost:3000/admin/user-management"),
        formData,
        fetchImpl: async () => ({
          ok: false,
          status: 404,
          async json() {
            return {
              error: "not_found"
            };
          }
        })
      }),
    (error) => {
      assert.ok(error instanceof AccessControlMutationApiError);
      assert.equal(error.code, "access_control_route_unavailable");
      assert.equal(error.statusCode, 404);
      assert.equal(
        error.message,
        "Access control update route is unavailable on the backend. Restart 2020RM-backend and try again."
      );
      return true;
    }
  );
});

test("access control local person mutation proxies the create request through the BFF", async () => {
  const calls = [];
  const formData = new FormData();
  formData.set("userId", "usr_1");

  const result = await createAccessControlLocalPerson({
    request: new Request("http://localhost:3000/admin/user-management", {
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
            user: {
              id: "usr_1",
              localPersonId: "person-local-41"
            },
            person: {
              uuid: "person-local-41",
              created: true
            },
            link: {
              localPersonId: "person-local-41",
              rpcPersonId: null
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/admin/access/users/usr_1/create-local-person");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(result, {
    user: {
      id: "usr_1",
      localPersonId: "person-local-41"
    },
    person: {
      uuid: "person-local-41",
      created: true
    },
    link: {
      localPersonId: "person-local-41",
      rpcPersonId: null
    }
  });
});

test("access control user creation proxies the create request through the BFF", async () => {
  const calls = [];
  const formData = new FormData();
  formData.set("firstName", "Peter");
  formData.set("lastName", "Weyland");
  formData.set("email", "peter.weyland@example.com");

  const user = await createAccessControlUser({
    request: new Request("http://localhost:3000/admin/user-management", {
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
            user: {
              id: "usr_0001",
              email: "peter.weyland@example.com"
            }
          };
        }
      };
    }
  });

  assert.equal(calls[0].url, "http://localhost:3000/api/admin/access/users");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    firstName: "Peter",
    lastName: "Weyland",
    email: "peter.weyland@example.com"
  });
  assert.deepEqual(user, {
    id: "usr_0001",
    email: "peter.weyland@example.com"
  });
});

test("ghost start proxies through the frontend ghost endpoint", async () => {
  const calls = [];
  const formData = new FormData();
  formData.set("effectiveUserId", "usr_0001");

  const ghost = await startGhostSession({
    request: new Request("http://localhost:3000/admin/user-management", {
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
            ghost: {
              active: true,
              effectiveUserId: "usr_0001"
            }
          };
        }
      };
    }
  });

  assert.equal(calls[0].url, "http://localhost:3000/api/ghost/start");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    effectiveUserId: "usr_0001"
  });
  assert.deepEqual(ghost, {
    active: true,
    effectiveUserId: "usr_0001"
  });
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { FileSessionStore } = require("../src/session/store");

function createTempSessionPath() {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "crm-session-store-")),
    "sessions.json"
  );
}

function storeSet(store, sessionId, sessionValue) {
  return new Promise((resolve, reject) => {
    store.set(sessionId, sessionValue, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function storeGet(store, sessionId) {
  return new Promise((resolve, reject) => {
    store.get(sessionId, (error, value) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(value);
    });
  });
}

test("FileSessionStore reloads persisted sessions after store recreation", async () => {
  const filePath = createTempSessionPath();
  const firstStore = new FileSessionStore({ filePath });

  await storeSet(firstStore, "sid-1", {
    cookie: {
      expires: new Date(Date.now() + 60_000).toISOString()
    },
    user: {
      email: "user@example.com"
    },
    tokens: {
      accessToken: "token-123",
      refreshToken: "refresh-123"
    }
  });

  const secondStore = new FileSessionStore({ filePath });
  const sessionValue = await storeGet(secondStore, "sid-1");

  assert.equal(sessionValue.user.email, "user@example.com");
  assert.equal(sessionValue.tokens.accessToken, "token-123");
});

test("FileSessionStore prunes expired sessions on read", async () => {
  const filePath = createTempSessionPath();
  const store = new FileSessionStore({ filePath });

  await storeSet(store, "sid-expired", {
    cookie: {
      expires: new Date(Date.now() - 60_000).toISOString()
    },
    user: {
      email: "expired@example.com"
    }
  });

  const sessionValue = await storeGet(store, "sid-expired");

  assert.equal(sessionValue, null);
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, "utf8")), {});
});

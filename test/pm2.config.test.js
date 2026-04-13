const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const configPath = path.resolve(__dirname, "../pm2.config.js");

function loadConfig() {
  delete require.cache[configPath];
  return require(configPath);
}

test("pm2.config starts one frontend process", () => {
  const config = loadConfig();

  assert.ok(config);
  assert.ok(Array.isArray(config.apps));
  assert.equal(config.apps.length, 1);
  assert.deepEqual(config.apps[0], {
    name: "2020rm-frontend",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: "3000"
    }
  });
});

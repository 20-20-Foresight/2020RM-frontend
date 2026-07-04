require("dotenv").config();
const path = require("node:path");
const { createRequestHandler } = require("@remix-run/express");
const Logger = require("@20-20-Foresight/base/log");
const { loadConfig } = require("./config");
const { createApp } = require("./app");

const config = loadConfig();
const log = new Logger("frontend", "server");

const buildPath = path.resolve(__dirname, "../build");

const app = createApp(config, (req, res, next) => {
  // In dev, purge build from require cache on each request to pick up changes.
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(buildPath)) delete require.cache[key];
  }

  const build = require(buildPath);

  return createRequestHandler({
    build,
    mode: process.env.NODE_ENV,
    onError: (error) => {
      log.error("remix handler error", error instanceof Error ? error.stack || error.message : error);
    }
  })(req, res, next);
});

app.listen(config.port, () => {
  log.system(`2020RM frontend listening on ${config.baseUrl}`);
});

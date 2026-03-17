const session = require("express-session");

/**
 * Returns the session store. Currently in-memory; swap here for Redis or another store.
 * @returns {session.Store}
 */
function getSessionStore() {
  return new session.MemoryStore();
}

module.exports = {
  getSessionStore
};

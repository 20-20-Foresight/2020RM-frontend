const fs = require("node:fs");
const path = require("node:path");
const session = require("express-session");

class FileSessionStore extends session.Store {
  /**
   * @param {{ filePath: string }} options
   */
  constructor({ filePath }) {
    super();
    this.filePath = filePath;
    this.sessions = this.#loadSessions();
  }

  /**
   * @returns {Record<string, object>}
   */
  #loadSessions() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      if (error && (error.code === "ENOENT" || error.name === "SyntaxError")) {
        return {};
      }
      throw error;
    }
  }

  #persistSessions() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.sessions, null, 2));
    fs.renameSync(tempPath, this.filePath);
  }

  /**
   * @param {object|null|undefined} sessionValue
   * @returns {boolean}
   */
  #isExpired(sessionValue) {
    const expiresAt = sessionValue?.cookie?.expires;
    if (!expiresAt) {
      return false;
    }

    const expiryTime = new Date(expiresAt).getTime();
    return Number.isFinite(expiryTime) && expiryTime <= Date.now();
  }

  #pruneExpiredSession(sessionId) {
    if (!Object.prototype.hasOwnProperty.call(this.sessions, sessionId)) {
      return false;
    }

    if (!this.#isExpired(this.sessions[sessionId])) {
      return false;
    }

    delete this.sessions[sessionId];
    this.#persistSessions();
    return true;
  }

  get(sessionId, callback) {
    try {
      if (this.#pruneExpiredSession(sessionId)) {
        return callback(null, null);
      }

      return callback(null, this.sessions[sessionId] || null);
    } catch (error) {
      return callback(error);
    }
  }

  set(sessionId, sessionValue, callback) {
    try {
      this.sessions[sessionId] = sessionValue;
      this.#persistSessions();
      return callback?.(null);
    } catch (error) {
      return callback?.(error);
    }
  }

  destroy(sessionId, callback) {
    try {
      delete this.sessions[sessionId];
      this.#persistSessions();
      return callback?.(null);
    } catch (error) {
      return callback?.(error);
    }
  }

  touch(sessionId, sessionValue, callback) {
    try {
      if (!Object.prototype.hasOwnProperty.call(this.sessions, sessionId)) {
        return callback?.(null);
      }

      this.sessions[sessionId] = {
        ...this.sessions[sessionId],
        cookie: sessionValue.cookie
      };
      this.#persistSessions();
      return callback?.(null);
    } catch (error) {
      return callback?.(error);
    }
  }
}

/**
 * Returns the session store.
 * @param {{ filePath: string }} options
 * @returns {session.Store}
 */
function getSessionStore(options) {
  const filePath =
    options && typeof options.filePath === "string" && options.filePath.trim()
      ? options.filePath
      : path.resolve(__dirname, "../../.store/session-store.json");
  return new FileSessionStore({ filePath });
}

module.exports = {
  FileSessionStore,
  getSessionStore
};

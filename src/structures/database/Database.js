const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "../../../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "val13t.db");
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency and performance
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    puuid TEXT,
    username TEXT,
    region TEXT,
    headers TEXT,
    ssid_cookie TEXT,
    is_blacklist INTEGER DEFAULT 0,
    updated_at INTEGER
  );
`);

const stmtGetUser = db.prepare("SELECT * FROM users WHERE user_id = ?");
const stmtUpsertSession = db.prepare(`
  INSERT INTO users (user_id, puuid, username, region, headers, ssid_cookie, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    puuid = excluded.puuid,
    username = excluded.username,
    region = excluded.region,
    headers = excluded.headers,
    ssid_cookie = excluded.ssid_cookie,
    updated_at = excluded.updated_at
`);
const stmtClearSession = db.prepare(`
  UPDATE users
  SET puuid = NULL, username = NULL, region = NULL, headers = NULL, ssid_cookie = NULL, updated_at = ?
  WHERE user_id = ?
`);
const stmtSetBlacklist = db.prepare(`
  INSERT INTO users (user_id, is_blacklist, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    is_blacklist = excluded.is_blacklist,
    updated_at = excluded.updated_at
`);

// Auto-migrate existing users.json on first run if present
const legacyUsersPath = path.resolve(__dirname, "../valorant/Assets/Data/users.json");
if (fs.existsSync(legacyUsersPath)) {
  try {
    const raw = fs.readFileSync(legacyUsersPath, "utf-8");
    const legacyUsers = JSON.parse(raw);
    for (const [userId, u] of Object.entries(legacyUsers)) {
      if (u && u.puuid && !stmtGetUser.get(userId)?.puuid) {
        stmtUpsertSession.run(
          userId,
          u.puuid,
          u.username || "Valorant Player",
          u.region || "ap",
          JSON.stringify(u.headers || {}),
          u.ssidCookie || null,
          Date.now()
        );
      }
    }
  } catch (_) {}
}

/**
 * Retrieves a user's Valorant session from SQLite.
 */
const getUser = (userId) => {
  const row = stmtGetUser.get(String(userId));
  if (!row || !row.puuid) return undefined;

  let parsedHeaders = {};
  try {
    parsedHeaders = row.headers ? JSON.parse(row.headers) : {};
  } catch (_) {}

  return {
    puuid: row.puuid,
    username: row.username,
    region: row.region,
    headers: parsedHeaders,
    ssidCookie: row.ssid_cookie || null,
  };
};

/**
 * Saves or updates a user's Valorant session in SQLite.
 */
const saveUser = (userId, userObj) => {
  stmtUpsertSession.run(
    String(userId),
    userObj.puuid || null,
    userObj.username || null,
    userObj.region || "ap",
    JSON.stringify(userObj.headers || {}),
    userObj.ssidCookie || null,
    Date.now()
  );
};

/**
 * Clears a user's Valorant session from SQLite.
 */
const deleteUser = (userId) => {
  stmtClearSession.run(Date.now(), String(userId));
};

/**
 * Checks if a Discord user is blacklisted.
 */
const isUserBlacklisted = (userId) => {
  const row = stmtGetUser.get(String(userId));
  return Boolean(row && row.is_blacklist === 1);
};

/**
 * Sets or unsets a Discord user's blacklist status.
 */
const setUserBlacklist = (userId, isBlacklisted) => {
  stmtSetBlacklist.run(String(userId), isBlacklisted ? 1 : 0, Date.now());
};

module.exports = {
  db,
  DB_PATH,
  getUser,
  saveUser,
  deleteUser,
  isUserBlacklisted,
  setUserBlacklist,
};

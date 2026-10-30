const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "../../../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "val13t.db");
const db = new DatabaseSync(DB_PATH);

const MAX_ACCOUNTS_PER_USER = 5;
const MAX_WISHLIST_PER_ACCOUNT = 25;

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

  CREATE TABLE IF NOT EXISTS accounts (
    user_id TEXT NOT NULL,
    puuid TEXT NOT NULL,
    username TEXT,
    region TEXT,
    headers TEXT,
    ssid_cookie TEXT,
    refresh_token TEXT,
    daily_dm INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    updated_at INTEGER,
    PRIMARY KEY (user_id, puuid)
  );

  CREATE TABLE IF NOT EXISTS wishlists (
    user_id TEXT NOT NULL,
    puuid TEXT NOT NULL,
    skin_uuid TEXT NOT NULL,
    skin_name TEXT NOT NULL,
    created_at INTEGER,
    PRIMARY KEY (user_id, puuid, skin_uuid)
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS command_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_name TEXT NOT NULL,
    user_id TEXT,
    guild_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cmd_logs_created_at ON command_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_cmd_logs_command_name ON command_logs(command_name);
`);

// Ensure existing databases have the `refresh_token` and `daily_dm` columns on `accounts`
try {
  db.exec("ALTER TABLE accounts ADD COLUMN refresh_token TEXT;");
} catch (_) {}
try {
  db.exec("ALTER TABLE accounts ADD COLUMN daily_dm INTEGER DEFAULT 0;");
} catch (_) {}

const stmtGetUser = db.prepare("SELECT * FROM users WHERE user_id = ?");
const stmtGetActiveAccount = db.prepare(`
  SELECT * FROM accounts
  WHERE user_id = ?
  ORDER BY is_active DESC, updated_at DESC
  LIMIT 1
`);
const stmtGetAllAccounts = db.prepare(`
  SELECT * FROM accounts
  WHERE user_id = ?
  ORDER BY is_active DESC, updated_at DESC
`);
const stmtGetAccountByPuuid = db.prepare(`
  SELECT * FROM accounts
  WHERE user_id = ? AND puuid = ?
`);
const stmtDeactivateAllAccounts = db.prepare(`
  UPDATE accounts SET is_active = 0 WHERE user_id = ?
`);
const stmtActivateAccount = db.prepare(`
  UPDATE accounts SET is_active = 1, updated_at = ? WHERE user_id = ? AND puuid = ?
`);
const stmtUpsertAccount = db.prepare(`
  INSERT INTO accounts (user_id, puuid, username, region, headers, ssid_cookie, refresh_token, is_active, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id, puuid) DO UPDATE SET
    username = excluded.username,
    region = excluded.region,
    headers = excluded.headers,
    ssid_cookie = excluded.ssid_cookie,
    refresh_token = excluded.refresh_token,
    is_active = excluded.is_active,
    updated_at = excluded.updated_at
`);
const stmtUpdateAccountSession = db.prepare(`
  UPDATE accounts
  SET headers = ?, ssid_cookie = ?, refresh_token = ?, updated_at = ?
  WHERE user_id = ? AND puuid = ?
`);
const stmtDeleteAccountByPuuid = db.prepare(`
  DELETE FROM accounts WHERE user_id = ? AND puuid = ?
`);
const stmtDeleteAllAccounts = db.prepare(`
  DELETE FROM accounts WHERE user_id = ?
`);
const stmtClearLegacySession = db.prepare(`
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

// Auto-migrate existing single-account rows from `users` table into `accounts` table
try {
  const legacyRows = db
    .prepare("SELECT * FROM users WHERE puuid IS NOT NULL")
    .all();
  for (const row of legacyRows) {
    const existing = stmtGetAccountByPuuid.get(row.user_id, row.puuid);
    if (!existing) {
      stmtUpsertAccount.run(
        row.user_id,
        row.puuid,
        row.username || "Valorant Player",
        row.region || "ap",
        row.headers || "{}",
        row.ssid_cookie || null,
        null,
        1,
        row.updated_at || Date.now()
      );
    }
  }
} catch (_) {}

const formatAccountRow = (row) => {
  if (!row || !row.puuid) return undefined;
  let parsedHeaders = {};
  try {
    parsedHeaders = row.headers ? JSON.parse(row.headers) : {};
  } catch (_) {}

  return {
    userId: row.user_id,
    puuid: row.puuid,
    username: row.username,
    region: row.region,
    headers: parsedHeaders,
    ssidCookie: row.ssid_cookie || null,
    refreshToken: row.refresh_token || null,
    dailyDm: row.daily_dm === 1,
    isActive: row.is_active === 1,
    updatedAt: row.updated_at,
  };
};

/**
 * Retrieves the currently active Valorant account for a Discord user.
 */
const getUser = (userId) => {
  const row = stmtGetActiveAccount.get(String(userId));
  return formatAccountRow(row);
};

/**
 * Retrieves a specific Valorant account by PUUID for a Discord user.
 */
const getAccountByPuuid = (userId, puuid) => {
  const row = stmtGetAccountByPuuid.get(String(userId), String(puuid));
  return formatAccountRow(row);
};

/**
 * Retrieves all linked Valorant accounts for a Discord user.
 */
const getUserAccounts = (userId) => {
  const rows = stmtGetAllAccounts.all(String(userId));
  return rows.map(formatAccountRow).filter(Boolean);
};

/**
 * Saves or updates a Valorant account in SQLite and sets it as the active account.
 */
const saveUser = (userId, userObj) => {
  const uid = String(userId);
  if (!userObj || !userObj.puuid) return;

  stmtDeactivateAllAccounts.run(uid);
  stmtUpsertAccount.run(
    uid,
    userObj.puuid,
    userObj.username || "Valorant Player",
    userObj.region || "ap",
    JSON.stringify(userObj.headers || {}),
    userObj.ssidCookie || null,
    userObj.refreshToken || null,
    1,
    Date.now()
  );
};

/**
 * Updates the session credentials (headers, ssidCookie, refreshToken) for a specific account
 * without changing active account selection.
 */
const updateAccountSession = (userId, puuid, sessionData) => {
  const uid = String(userId);
  const targetPuuid = String(puuid);
  const existing = getAccountByPuuid(uid, targetPuuid);
  if (!existing) return undefined;

  const nextHeaders =
    sessionData.headers !== undefined ? sessionData.headers : existing.headers;
  const nextSsid =
    sessionData.ssidCookie !== undefined ? sessionData.ssidCookie : existing.ssidCookie;
  const nextRefresh =
    sessionData.refreshToken !== undefined
      ? sessionData.refreshToken
      : existing.refreshToken;

  stmtUpdateAccountSession.run(
    JSON.stringify(nextHeaders || {}),
    nextSsid || null,
    nextRefresh || null,
    Date.now(),
    uid,
    targetPuuid
  );

  return getAccountByPuuid(uid, targetPuuid);
};

/**
 * Switches the active Valorant account for a Discord user.
 */
const setActiveAccount = (userId, puuid) => {
  const uid = String(userId);
  const target = stmtGetAccountByPuuid.get(uid, String(puuid));
  if (!target) return undefined;

  stmtDeactivateAllAccounts.run(uid);
  stmtActivateAccount.run(Date.now(), uid, String(puuid));
  return getUser(uid);
};

/**
 * Deletes one specific Valorant account (if puuid is provided) or all accounts for a user.
 * Automatically promotes another linked account to active if the active one was deleted.
 */
const deleteUser = (userId, puuid = null) => {
  const uid = String(userId);

  if (puuid) {
    stmtDeleteAccountByPuuid.run(uid, String(puuid));
    db.prepare("DELETE FROM wishlists WHERE user_id = ? AND puuid = ?").run(uid, String(puuid));
    const remaining = getUserAccounts(uid);
    if (remaining.length > 0 && !remaining.some((acc) => acc.isActive)) {
      stmtActivateAccount.run(Date.now(), uid, remaining[0].puuid);
    }
  } else {
    stmtDeleteAllAccounts.run(uid);
    db.prepare("DELETE FROM wishlists WHERE user_id = ?").run(uid);
    stmtClearLegacySession.run(Date.now(), uid);
  }
};

// ---- Wishlist & Daily Store Auto-DM Helpers ----
const stmtGetWishlist = db.prepare(`
  SELECT skin_uuid AS uuid, skin_name AS name, created_at AS createdAt
  FROM wishlists
  WHERE user_id = ? AND puuid = ?
  ORDER BY created_at ASC
`);
const stmtAddWishlist = db.prepare(`
  INSERT INTO wishlists (user_id, puuid, skin_uuid, skin_name, created_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id, puuid, skin_uuid) DO UPDATE SET
    skin_name = excluded.skin_name
`);
const stmtRemoveWishlist = db.prepare(`
  DELETE FROM wishlists WHERE user_id = ? AND puuid = ? AND skin_uuid = ?
`);
const stmtClearWishlist = db.prepare(`
  DELETE FROM wishlists WHERE user_id = ? AND puuid = ?
`);
const stmtSetDailyDm = db.prepare(`
  UPDATE accounts SET daily_dm = ?, updated_at = ? WHERE user_id = ? AND puuid = ?
`);
const stmtGetAllAutoCheckAccounts = db.prepare(`
  SELECT DISTINCT a.*
  FROM accounts a
  LEFT JOIN wishlists w ON a.user_id = w.user_id AND a.puuid = w.puuid
  WHERE a.daily_dm = 1 OR w.skin_uuid IS NOT NULL
`);

const getWishlist = (userId, puuid) => {
  return stmtGetWishlist.all(String(userId), String(puuid));
};

const addWishlistItem = (userId, puuid, skinUuid, skinName) => {
  stmtAddWishlist.run(
    String(userId),
    String(puuid),
    String(skinUuid),
    String(skinName),
    Date.now()
  );
};

const removeWishlistItem = (userId, puuid, skinUuid) => {
  const res = stmtRemoveWishlist.run(String(userId), String(puuid), String(skinUuid));
  return res.changes > 0;
};

const clearWishlist = (userId, puuid) => {
  stmtClearWishlist.run(String(userId), String(puuid));
};

const setDailyStoreDm = (userId, puuid, enabled) => {
  stmtSetDailyDm.run(enabled ? 1 : 0, Date.now(), String(userId), String(puuid));
  return getAccountByPuuid(userId, puuid);
};

const getAllAutoCheckAccounts = () => {
  const rows = stmtGetAllAutoCheckAccounts.all();
  return rows.map(formatAccountRow).filter(Boolean);
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

const stmtGetSetting = db.prepare("SELECT value FROM system_settings WHERE key = ?");
const stmtSetSetting = db.prepare(`
  INSERT INTO system_settings (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

const getSystemSetting = (key) => {
  const row = stmtGetSetting.get(String(key));
  return row ? row.value : null;
};

const setSystemSetting = (key, value) => {
  stmtSetSetting.run(String(key), String(value), Date.now());
};

// ---- Command Usage & Analytics Helpers ----
const stmtLogCommand = db.prepare(`
  INSERT INTO command_logs (command_name, user_id, guild_id, created_at)
  VALUES (?, ?, ?, ?)
`);

const stmtClearOldLogs = db.prepare("DELETE FROM command_logs WHERE created_at < ?");

const logCommandUsage = (commandName, userId, guildId = null) => {
  try {
    stmtLogCommand.run(
      String(commandName),
      String(userId),
      guildId ? String(guildId) : null,
      Date.now()
    );
  } catch (_) {
    // Fail silently so logging errors never disrupt command flow
  }
};

const getCommandStats = (timeframe = "all") => {
  let since = 0;
  const now = Date.now();
  const tf = String(timeframe || "").toLowerCase();

  if (tf === "24h" || tf === "today" || tf === "day") {
    since = now - 24 * 60 * 60 * 1000;
  } else if (tf === "7d" || tf === "week") {
    since = now - 7 * 24 * 60 * 60 * 1000;
  } else if (tf === "30d" || tf === "month") {
    since = now - 30 * 24 * 60 * 60 * 1000;
  }

  const overviewStmt = db.prepare(`
    SELECT
      COUNT(*) AS total_commands,
      COUNT(DISTINCT user_id) AS unique_users,
      COUNT(DISTINCT guild_id) AS unique_guilds
    FROM command_logs
    WHERE created_at >= ?
  `);
  const overview = overviewStmt.get(since) || {
    total_commands: 0,
    unique_users: 0,
    unique_guilds: 0,
  };

  const topCommandsStmt = db.prepare(`
    SELECT command_name, COUNT(*) AS count
    FROM command_logs
    WHERE created_at >= ?
    GROUP BY command_name
    ORDER BY count DESC
    LIMIT 10
  `);
  const topCommands = topCommandsStmt.all(since) || [];

  const dbTotalsStmt = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM accounts) AS total_accounts,
      (SELECT COUNT(DISTINCT user_id) FROM accounts) AS total_users,
      (SELECT COUNT(*) FROM accounts WHERE daily_dm = 1) AS auto_dm_accounts,
      (SELECT COUNT(*) FROM wishlists) AS total_wishlists,
      (SELECT COUNT(DISTINCT user_id) FROM wishlists) AS users_with_wishlist
  `);
  const dbTotals = dbTotalsStmt.get() || {
    total_accounts: 0,
    total_users: 0,
    auto_dm_accounts: 0,
    total_wishlists: 0,
    users_with_wishlist: 0,
  };

  return {
    timeframe: tf || "all",
    since,
    overview,
    topCommands,
    dbTotals,
  };
};

const clearOldCommandLogs = (daysToKeep = 90) => {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  stmtClearOldLogs.run(cutoff);
};

module.exports = {
  db,
  DB_PATH,
  MAX_ACCOUNTS_PER_USER,
  MAX_WISHLIST_PER_ACCOUNT,
  getUser,
  getAccountByPuuid,
  getUserAccounts,
  saveUser,
  updateAccountSession,
  setActiveAccount,
  deleteUser,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  clearWishlist,
  setDailyStoreDm,
  getAllAutoCheckAccounts,
  isUserBlacklisted,
  setUserBlacklist,
  getSystemSetting,
  setSystemSetting,
  logCommandUsage,
  getCommandStats,
  clearOldCommandLogs,
};

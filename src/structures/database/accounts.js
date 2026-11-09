const { db } = require("./connection");

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
  ORDER BY rowid ASC
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
  const legacyRows = db.prepare("SELECT * FROM users WHERE puuid IS NOT NULL").all();
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
        row.updated_at || Date.now(),
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

const getUser = (userId) => {
  const row = stmtGetActiveAccount.get(String(userId));
  return formatAccountRow(row);
};

const getAccountByPuuid = (userId, puuid) => {
  const row = stmtGetAccountByPuuid.get(String(userId), String(puuid));
  return formatAccountRow(row);
};

const getUserAccounts = (userId) => {
  const rows = stmtGetAllAccounts.all(String(userId));
  return rows.map(formatAccountRow).filter(Boolean);
};

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
    Date.now(),
  );
};

const updateAccountSession = (userId, puuid, sessionData) => {
  const uid = String(userId);
  const targetPuuid = String(puuid);
  const existing = getAccountByPuuid(uid, targetPuuid);
  if (!existing) return undefined;

  const nextHeaders = sessionData.headers !== undefined ? sessionData.headers : existing.headers;
  const nextSsid =
    sessionData.ssidCookie !== undefined ? sessionData.ssidCookie : existing.ssidCookie;
  const nextRefresh =
    sessionData.refreshToken !== undefined ? sessionData.refreshToken : existing.refreshToken;

  stmtUpdateAccountSession.run(
    JSON.stringify(nextHeaders || {}),
    nextSsid || null,
    nextRefresh || null,
    Date.now(),
    uid,
    targetPuuid,
  );

  return getAccountByPuuid(uid, targetPuuid);
};

const setActiveAccount = (userId, puuid) => {
  const uid = String(userId);
  const target = stmtGetAccountByPuuid.get(uid, String(puuid));
  if (!target) return undefined;

  stmtDeactivateAllAccounts.run(uid);
  stmtActivateAccount.run(Date.now(), uid, String(puuid));
  return getUser(uid);
};

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

const isUserBlacklisted = (userId) => {
  const row = stmtGetUser.get(String(userId));
  return Boolean(row && row.is_blacklist === 1);
};

const setUserBlacklist = (userId, isBlacklisted) => {
  stmtSetBlacklist.run(String(userId), isBlacklisted ? 1 : 0, Date.now());
};

module.exports = {
  formatAccountRow,
  getUser,
  getAccountByPuuid,
  getUserAccounts,
  saveUser,
  updateAccountSession,
  setActiveAccount,
  deleteUser,
  isUserBlacklisted,
  setUserBlacklist,
};

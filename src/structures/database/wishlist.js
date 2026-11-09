const { db } = require("./connection");
const { formatAccountRow, getAccountByPuuid } = require("./accounts");

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
  WHERE (a.daily_dm = 1 OR w.skin_uuid IS NOT NULL)
    AND (
      a.ssid_cookie IS NOT NULL
      OR a.refresh_token IS NOT NULL
      OR (a.headers IS NOT NULL AND a.headers != '{}' AND a.headers != '')
    )
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
    Date.now(),
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

module.exports = {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  clearWishlist,
  setDailyStoreDm,
  getAllAutoCheckAccounts,
};

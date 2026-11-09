const { db } = require("./connection");

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

module.exports = {
  getSystemSetting,
  setSystemSetting,
};

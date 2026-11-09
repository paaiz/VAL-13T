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

try {
  db.exec("ALTER TABLE accounts ADD COLUMN refresh_token TEXT;");
} catch (_) {}
try {
  db.exec("ALTER TABLE accounts ADD COLUMN daily_dm INTEGER DEFAULT 0;");
} catch (_) {}

module.exports = {
  db,
  DB_PATH,
  MAX_ACCOUNTS_PER_USER,
  MAX_WISHLIST_PER_ACCOUNT,
};

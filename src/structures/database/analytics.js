const { db } = require("./connection");

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
      Date.now(),
    );
  } catch (_) {}
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
  logCommandUsage,
  getCommandStats,
  clearOldCommandLogs,
};

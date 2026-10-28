const { ActivityType } = require("discord.js");
const cron = require("node-cron");
const Event = require("../structures/Event");
const { loadWeaponSkins } = require("../structures/valorant/util/Cache");
const { runDailyStoreNotifications } = require("../structures/valorant/util/Notifier");

module.exports = class extends Event {
  constructor(...args) {
    super(...args, {
      once: true,
    });
  }

  async run() {
    this.client.logger.ready(`Logged In As ${this.client.user.tag}`);
    this.client.logger.ready(`Loaded ${this.client.events.size} Events!`);
    this.client.logger.ready(`Loaded ${this.client.prefixCommands.size} Prefix Commands!`);

    // Update latest weapon skins cache from valorant-api.com on startup
    await loadWeaponSkins();

    // Auto-sync weapon skins & send Wishlist / Daily Store DMs daily at 07:01 WIB
    // (1-minute buffer after store reset to avoid Riot 502 Bad Gateway during rotation)
    cron.schedule(
      "1 7 * * *",
      async () => {
        try {
          await loadWeaponSkins();
          await runDailyStoreNotifications(this.client);
        } catch (err) {
          this.client.logger.err(`[NOTIFIER-CRON] - ${err.message}`);
        }
      },
      { timezone: "Asia/Jakarta" }
    );

    // Auto catch-up: if bot starts/restarts past 07:00 WIB and today's notifications haven't completed yet
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const currentHourWIB = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);

    if (currentHourWIB >= 7) {
      setTimeout(async () => {
        try {
          this.client.logger.ready("[NOTIFIER] Checking if today's store notifications were delivered...");
          await runDailyStoreNotifications(this.client);
        } catch (err) {
          this.client.logger.err(`[NOTIFIER-STARTUP] - ${err.message}`);
        }
      }, 5000);
    }

    // Status
    let number = 0;
    const updateActivity = () => {
      const getGuildCount = this.client.guilds.cache.size;
      const getGuildUsers = this.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

      const statusString = [
        {
          name: "/help | /store",
          type: ActivityType.Listening,
        },
        {
          name: `${getGuildCount} Servers & ${getGuildUsers} Users`,
          type: ActivityType.Watching,
        },
      ];

      this.client.user.setPresence({
        status: "online",
        activities: [statusString[number]],
      });

      if (++number >= statusString.length) {
        number = 0;
      }

      setTimeout(updateActivity, 1000 * 60 * 1);
    };
    updateActivity();

    // Load slash command!
    await this.client.utils.loadSlashCommands().then(() => {
      this.client.logger.ready(`Loaded ${this.client.commands.size} Slash Commands!`);
    });

    // * Deploying slash commands in global
    // Development bot deploys everything (including devMode commands) for testing;
    // the production bot only deploys commands that are ready (devMode === false).
    const isDevelopment = this.client.config.client?.development === true;
    const getSlashData = this.client.commands
      .filter((x) => isDevelopment || !x.devMode)
      .map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        options: cmd.options,
      }));

    try {
      await this.client.application.commands.set(getSlashData);
      this.client.logger.ready(
        `Slash Commands Deployed Globally! (${isDevelopment ? "DEVELOPMENT" : "PRODUCTION"}: ${getSlashData.length} commands)`
      );
    } catch (err) {
      console.log(err);
    }
  }
};
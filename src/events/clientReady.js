const { ActivityType } = require("discord.js");
const cron = require("node-cron");
const Event = require("../structures/Event");
const { loadWeaponSkins } = require("../structures/valorant/util/Cache");

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

    // Auto-sync weapon skins daily at 07:00 WIB (Valorant store reset time)
    cron.schedule(
      "0 7 * * *",
      async () => {
        await loadWeaponSkins();
      },
      { timezone: "Asia/Jakarta" }
    );

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
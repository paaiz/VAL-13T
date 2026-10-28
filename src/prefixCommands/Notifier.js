const Command = require("../structures/PrefixCommand");
const { runDailyStoreNotifications } = require("../structures/valorant/util/Notifier");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      aliases: ["run-notifier", "check-store"],
      guildOnly: true,
      ownerOnly: true,
    });
  }

  async run(message, args) {
    const force = args[0]?.toLowerCase() === "force";
    const statusMsg = await message.reply({
      content: `<a:val_dc_load:957192309399760926> Running Daily Store & Wishlist check${force ? " (FORCED)" : ""}... Please wait!`,
    });

    try {
      const res = await runDailyStoreNotifications(this.client, { force });

      if (res.skipped) {
        return statusMsg.edit({
          content: `ℹ️ Today's store check (\`${res.todayStr}\`) was already completed earlier! Use \`${this.client.config.client.prefix}notifier force\` to re-run and re-send.`,
        });
      }

      return statusMsg.edit({
        content: `✅ Successfully completed daily store check for **${res.todayStr}**! Sent **${res.sentCount}** DM notification(s).`,
      });
    } catch (err) {
      this.client.logger.err(`[NOTIFIER-PREFIX] - ${err.message}`);
      return statusMsg.edit({
        content: `❌ Error running daily store check: \`${err.message}\``,
      });
    }
  }
};

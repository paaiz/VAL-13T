const Command = require("../structures/PrefixCommand");
const { EmbedBuilder } = require("discord.js");
const { getCommandStats } = require("../structures/database/Database");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      aliases: ["stats", "stat", "usage", "cmdstats"],
      guildOnly: false,
      ownerOnly: true,
    });
  }

  async run(message, args) {
    const rawTimeframe = (args[0] || "all").toLowerCase();
    const timeframeLabels = {
      "24h": "Last 24 Hours",
      today: "Today (24h)",
      day: "Today (24h)",
      "7d": "Last 7 Days",
      week: "Last 7 Days",
      "30d": "Last 30 Days",
      month: "Last 30 Days",
      all: "All Time",
    };

    const activeTf = Object.keys(timeframeLabels).includes(rawTimeframe) ? rawTimeframe : "all";
    const label = timeframeLabels[activeTf] || "All Time";

    const stats = getCommandStats(activeTf);
    const { overview, topCommands, dbTotals } = stats;

    const totalCmds = overview.total_commands || 0;
    const uniqueUsers = overview.unique_users || 0;
    const uniqueGuilds = overview.unique_guilds || 0;

    const topList = topCommands.length
      ? topCommands
          .map((c, i) => {
            const pct = totalCmds > 0 ? ((c.count / totalCmds) * 100).toFixed(1) : 0;
            return `\`${i + 1}.\` **${c.command_name}** — **${c.count.toLocaleString()}** (\`${pct}%\`)`;
          })
          .join("\n")
      : "*No commands logged in this period yet.*";

    const totalGuilds = this.client.guilds.cache.size;
    const totalMembers = this.client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);
    const heapUsedMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const rssMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const uptimeSec = Math.floor(
      (Date.now() - (this.client.uptime || process.uptime() * 1000)) / 1000,
    );

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setAuthor({
        name: `Analytics & Statistics information for: ${label}`,
        iconURL: this.client.user.displayAvatarURL(),
      })
      .setDescription(
        `Command usage and database insights across all **${totalGuilds}** servers (**${totalMembers.toLocaleString()}** members).`,
      )
      .addFields(
        {
          name: `📊 Command Usage (${label})`,
          value: [
            `• **Total Executions:** \`${totalCmds.toLocaleString()}\``,
            `• **Active Users:** \`${uniqueUsers.toLocaleString()}\``,
            `• **Active Servers:** \`${uniqueGuilds.toLocaleString()}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name: "🎮 Valorant Database",
          value: [
            `• **Linked Accounts:** \`${dbTotals.total_accounts || 0}\` (\`${dbTotals.total_users || 0}\` users)`,
            `• **Daily Store Auto-DM:** \`${dbTotals.auto_dm_accounts || 0}\` accounts`,
            `• **Wishlist Items:** \`${dbTotals.total_wishlists || 0}\` (\`${dbTotals.users_with_wishlist || 0}\` users)`,
          ].join("\n"),
          inline: true,
        },
        {
          name: "⚡ Bot Runtime",
          value: [
            `• **RAM (Heap / RSS):** \`${heapUsedMb} MB\` / \`${rssMb} MB\``,
            `• **Uptime:** <t:${uptimeSec}:R>`,
            `• **Ping:** \`${this.client.ws.ping}ms\``,
          ].join("\n"),
          inline: false,
        },
        {
          name: `🏆 Top Commands (${label})`,
          value: topList,
          inline: false,
        },
      )
      .setFooter({
        text: `Filter with ${this.client.config.client.prefix}analytics <24h | 7d | 30d | all>`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};

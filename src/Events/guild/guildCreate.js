const Event = require("../../Structures/Event");
const { EmbedBuilder, WebhookClient } = require("discord.js");
const guildSchema = require("../../Structures/Database/Schema/GuildSchema");

module.exports = class extends Event {
  async run(guild) {
    try {
      if (process.env.MONGODB_URI) {
        await guildSchema.create({ guildId: guild.id }).catch(() => null);
      }

      if (!process.env.JOIN_WEBHOOK) return;

      const webhookClient = new WebhookClient({
        url: process.env.JOIN_WEBHOOK,
      });
      const timestamp = Math.floor(Date.now() / 1000);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${this.client.user.username} has joined a Server!`,
          iconURL: guild.iconURL() || undefined,
        })
        .setColor("Red")
        .setThumbnail(guild.iconURL() || null)
        .setDescription(`Joined Date: <t:${timestamp}>`)
        .addFields(
          { name: "Guild Name", value: `${guild.name} (${guild.id})` },
          {
            name: "Guild Owner",
            value: `[${(await guild.fetchOwner()).user.tag}] (${guild.ownerId})`,
            inline: true,
          },
          { name: "Guild Members", value: `${guild.memberCount}`, inline: true }
        );
      webhookClient.send({ embeds: [embed] });
    } catch (err) {
      this.client.logger.err(`[EVENT-guildCreate] - ${err.message}`);
    }
  }
};

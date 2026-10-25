const Command = require("../../Structures/Command");
const { EmbedBuilder } = require("discord.js");
const { getAccessoryStore } = require("../../Structures/Valorant/Util/Shop");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Check your weekly Accessory Store rotation (Kingdom Credits)!",
      category: "Valorant",
      categoryEmoji: "<:valorant_logo:965476928930852864>",
      guildOnly: true,
      devMode: false,
      userPerms: [],
      botPerms: [],
      options: [],
    });
  }

  async run(interaction) {
    await interaction.deferReply();

    try {
      const { username, expiresAt, items } = await getAccessoryStore(interaction.user.id);

      const mainEmbed = new EmbedBuilder()
        .setColor("Red")
        .setAuthor({
          name: `Accessory Store — ${username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setDescription(`Accessory Store rotation expires <t:${expiresAt}:R>`)
        .addFields(
          items.map((item, idx) => ({
            name: `${idx + 1}. [${item.type}] ${item.name}`,
            value: `👑 **${item.costKC.toLocaleString()} KC**`,
            inline: true,
          }))
        );

      const firstWithIcon = items.find((i) => i.icon);
      if (firstWithIcon) {
        mainEmbed.setThumbnail(firstWithIcon.icon);
      }

      return interaction.followUp({ embeds: [mainEmbed] });
    } catch (err) {
      this.client.logger.err(`[VALORANT-ACCESSORIES] - ${err.message}`);
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Accessory Store Status: ERROR",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(err.message),
        ],
      });
    }
  }
};

const Command = require("../../Structures/Command");
const { EmbedBuilder } = require("discord.js");
const { getFeaturedBundles } = require("../../Structures/Valorant/Util/Shop");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Check the active Featured Bundles in your Valorant Store!",
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
      const { username, bundles } = await getFeaturedBundles(interaction.user.id);

      const embeds = bundles.map((bundle) => {
        const eb = new EmbedBuilder()
          .setColor("Red")
          .setAuthor({
            name: `Featured Bundle information for: ${username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTitle(`🔥 ${bundle.name}`)
          .setDescription(
            [
              `💰 **Bundle Price:** <:vp_png:974611751146496020> **${bundle.price.toLocaleString()} VP**`,
              `⏳ **Expires:** <t:${bundle.expiresAt}:R>`,
            ].join("\n")
          );

        if (bundle.image) {
          eb.setImage(bundle.image);
        }
        return eb;
      });

      return interaction.followUp({ embeds });
    } catch (err) {
      this.client.logger.err(`[VALORANT-BUNDLES] - ${err.message}`);
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Bundles Status: ERROR",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(err.message),
        ],
      });
    }
  }
};

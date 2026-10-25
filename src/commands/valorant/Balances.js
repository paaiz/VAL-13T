const Command = require("../../structures/Command");
const { ApplicationCommandOptionType, EmbedBuilder, MessageFlags } = require("discord.js");

const { getBalances } = require("../../structures/valorant/util/Shop");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Check your current Valorant balances (VP, RP, Kingdom Credits).",
      category: "Valorant",
      categoryEmoji: "<:valorant_logo:965476928930852864>",
      guildOnly: true,
      devMode: false,
      userPerms: [],
      botPerms: [],
      options: [
        {
          name: "hide",
          description: "Hide or unhide your balance to others",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    });
  }

  async run(interaction) {
    let isHidden = interaction.options.getBoolean("hide");
    if (isHidden === null) isHidden = true;

    const embed = new EmbedBuilder().setColor("Red");

    try {
      const userBalance = await getBalances(interaction.user.id);

      await interaction.reply({
        embeds: [
          embed
            .setAuthor({
              name: `Balances information for: ${userBalance.username}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setColor("Red")
            .addFields(
              {
                name: `<:vp_png:974611751146496020> Valorant Point${userBalance.vp > 1 ? "s" : ""} (VP)`,
                value: `${userBalance.vp.toLocaleString()}`,
                inline: true,
              },
              {
                name: `<:rp_png:974612286041915422> Radianite Point${userBalance.rp > 1 ? "s" : ""} (RP)`,
                value: `${userBalance.rp.toLocaleString()}`,
                inline: true,
              },
              {
                name: `<:kc_png:1563849730491154563> Kingdom Credit${userBalance.kc > 1 ? "s" : ""} (KC)`,
                value: `${userBalance.kc.toLocaleString()}`,
                inline: true,
              },
            ),
        ],
        ...(isHidden ? { flags: MessageFlags.Ephemeral } : {}),
      });
    } catch (err) {
      this.client.logger.err(`[VALORANT-BALANCE] - ${err.message}`);
      return interaction.reply({
        embeds: [
          embed
            .setAuthor({
              name: "Balances status: ERROR",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(err.message),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
};

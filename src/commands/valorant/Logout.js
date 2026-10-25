const Command = require("../../structures/Command");
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
} = require("discord.js");

const {
  deleteUser,
  getUserAccounts,
} = require("../../structures/valorant/Valorant");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Logout and unlink your Riot account(s)!",
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
    const accounts = getUserAccounts(interaction.user.id);
    const embed = new EmbedBuilder().setColor("Red");

    if (!accounts.length) {
      return interaction.reply({
        embeds: [
          embed
            .setAuthor({
              name: "Logout Status: FAILED",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription("Cannot find your account. Try `/login` if you haven't logged in!"),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (accounts.length === 1) {
      try {
        const target = accounts[0];
        deleteUser(interaction.user.id, target.puuid);

        return interaction.reply({
          embeds: [
            embed
              .setAuthor({
                name: "Logout Status: SUCCESS",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription(`Successfully logged out for user: **${target.username}**`),
          ],
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        this.client.logger.err(`[VALORANT-LOGOUT] - ${err.message}`);
        return interaction.reply({
          embeds: [
            embed
              .setAuthor({
                name: "Logout Status: ERROR",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription("Something bad happened when trying to log you out. Try again later!"),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("logout-account-select")
      .setPlaceholder("Select an account to logout!")
      .addOptions([
        ...accounts.map((acc) => ({
          label: `${acc.username} (${acc.region.toUpperCase()})`,
          value: acc.puuid,
          description: acc.isActive ? "Currently Active Account" : "Linked Account",
          emoji: "<:valorant_logo:965476928930852864>",
        })),
        {
          label: "Logout All Accounts",
          value: "LOGOUT_ALL",
          description: `Remove all ${accounts.length} linked Valorant accounts`,
          emoji: "🗑️",
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const msg = await interaction.reply({
      embeds: [
        embed
          .setAuthor({
            name: "Logout — Select Account",
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setDescription(
            `You have **${accounts.length}** linked Valorant accounts. Select which account you would like to unlink below:`
          ),
      ],
      components: [row],
      flags: MessageFlags.Ephemeral,
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    collector.on("collect", async (inter) => {
      if (inter.customId !== "logout-account-select") return;
      collector.stop();

      const choice = inter.values[0];

      if (choice === "LOGOUT_ALL") {
        deleteUser(interaction.user.id);
        return inter.update({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setAuthor({
                name: "Logout Status: SUCCESS",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription(
                `Successfully logged out and unlinked all **${accounts.length}** Valorant accounts!`
              ),
          ],
          components: [],
        });
      }

      const target = accounts.find((a) => a.puuid === choice);
      deleteUser(interaction.user.id, choice);
      const remaining = getUserAccounts(interaction.user.id);
      const newActive = remaining.find((a) => a.isActive) || remaining[0];

      return inter.update({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Logout Status: SUCCESS",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(
              [
                `Successfully logged out for user: **${target ? target.username : choice}**`,
                newActive
                  ? `Your active account is now **${newActive.username}** (\`${newActive.region.toUpperCase()}\`).`
                  : "",
              ]
                .filter(Boolean)
                .join("\n")
            ),
        ],
        components: [],
      });
    });
  }
};

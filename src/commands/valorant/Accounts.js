const Command = require("../../structures/Command");
const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require("discord.js");
const {
  MAX_ACCOUNTS_PER_USER,
  getUserAccounts,
  setActiveAccount,
  checkAccountStatus,
} = require("../../structures/valorant/Valorant");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Manage your linked Valorant accounts and switch your active account!",
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

    if (!accounts.length) {
      const emptyContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "### Accounts Status: EMPTY",
              "You don't have any Valorant accounts linked yet! Run `/login` to add an account.",
            ].join("\n"),
          ),
        );

      return interaction.reply({
        components: [emptyContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
    }

    const buildAccountsContainer = (accList, disabled = false) => {
      const container = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `### Linked Accounts for: ${interaction.user.username}`,
              `You have **${accList.length}/${MAX_ACCOUNTS_PER_USER}** Valorant account${
                accList.length > 1 ? "s" : ""
              } linked.`,
              `Use \`/login\` to add another account or \`/logout\` to remove an account.`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

      accList.forEach((acc, idx) => {
        const section = new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [`**${idx + 1}. ${acc.username} (${acc.region.toUpperCase()})**`].join("\n"),
            ),
          )
          .setButtonAccessory(
            acc.isActive
              ? new ButtonBuilder()
                  .setCustomId(`accounts-active:${acc.puuid}`)
                  .setLabel("Active")
                  .setStyle(ButtonStyle.Success)
                  .setDisabled(true)
              : new ButtonBuilder()
                  .setCustomId(`accounts-switch:${acc.puuid}`)
                  .setLabel("Switch")
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(disabled),
          );

        container.addSectionComponents(section);

        if (idx < accList.length - 1) {
          container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
          );
        }
      });

      container
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# VAL-13T • Currently active: ${accounts.find((acc) => acc.isActive)?.username}`,
          ),
        );

      return container;
    };

    const hasMultiple = accounts.length > 1;

    const msg = await interaction.reply({
      components: [buildAccountsContainer(accounts, false)],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      fetchReply: true,
    });

    if (!hasMultiple) return;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (inter) => {
      if (!inter.customId.startsWith("accounts-switch:")) return;

      const selectedPuuid = inter.customId.split(":")[1];
      setActiveAccount(interaction.user.id, selectedPuuid);

      accounts.forEach((acc) => {
        acc.isActive = acc.puuid === selectedPuuid;
      });
      collector.resetTimer({ time: 60000, idle: 60000 });

      await inter.update({
        components: [buildAccountsContainer(accounts, false)],
        flags: MessageFlags.IsComponentsV2,
      });
    });

    collector.on("end", () => {
      if (accounts.length > 1) {
        msg
          .edit({
            components: [buildAccountsContainer(accounts, true)],
            flags: MessageFlags.IsComponentsV2,
          })
          .catch(() => null);
      }
    });
  }
};

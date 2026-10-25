const Command = require("../../structures/Command");
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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
    const embed = new EmbedBuilder().setColor("Red");

    if (!accounts.length) {
      return interaction.reply({
        embeds: [
          embed
            .setAuthor({
              name: "Accounts Status: EMPTY",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription("You don't have any Valorant accounts linked yet! Run `/login` to add an account."),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const buildAccountsEmbed = (accList) => {
      const fields = accList.map((acc, idx) => {
        const status = checkAccountStatus(acc);
        let statusText;
        if (status.valid) {
          statusText = `🟢 **Ready** (Expires <t:${status.expiresAt}:R>)`;
        } else if (status.hasCookie) {
          statusText = `🟡 **Auto-Refresh Ready** (Cookie Saved)`;
        } else {
          statusText = `🔴 **Expired** (Run \`/login\` to refresh)`;
        }

        return {
          name: `${idx + 1}. ${acc.username} (${acc.region.toUpperCase()})${
            acc.isActive ? " — ⭐ ACTIVE" : ""
          }`,
          value: [
            `> **Status:** ${statusText}`,
            `> **Auto-Refresh (Cookie):** ${
              status.hasCookie ? "✅ Enabled (Long-term)" : "❌ Disabled (1-Hour URL Token)"
            }`,
          ].join("\n"),
          inline: false,
        };
      });

      return new EmbedBuilder()
        .setColor("Red")
        .setAuthor({
          name: `Linked Accounts for: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setDescription(
          [
            `You have **${accList.length}/${MAX_ACCOUNTS_PER_USER}** Valorant account${
              accList.length > 1 ? "s" : ""
            } linked.`,
            `Use \`/login\` to add another account or refresh an expired session.`,
          ].join("\n")
        )
        .addFields(fields)
        .setFooter({
          text: "Your active account is used for /store, /bundles, /accessories, /balances & /nightmarket.",
          iconURL: this.client.user.displayAvatarURL(),
        });
    };

    const buildSwitchRow = (accList, disabled = false) => {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("accounts-switch-select")
        .setPlaceholder(
          disabled
            ? "This account switcher has expired!"
            : "Select an account to set as Active!"
        )
        .setDisabled(disabled)
        .addOptions(
          accList.map((acc) => {
            const status = checkAccountStatus(acc);
            return {
              label: `${acc.username} (${acc.region.toUpperCase()})`,
              value: acc.puuid,
              description: acc.isActive
                ? "Currently Active Account"
                : status.valid || status.hasCookie
                ? "Click to switch to this account"
                : "Session expired — switch or re-login",
              default: acc.isActive,
              emoji: "<:valorant_logo:965476928930852864>",
            };
          })
        );

      return new ActionRowBuilder().addComponents(menu);
    };

    const hasMultiple = accounts.length > 1;

    const msg = await interaction.reply({
      embeds: [buildAccountsEmbed(accounts)],
      components: hasMultiple ? [buildSwitchRow(accounts)] : [],
      flags: MessageFlags.Ephemeral,
      fetchReply: true,
    });

    if (!hasMultiple) return;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    collector.on("collect", async (inter) => {
      if (inter.customId !== "accounts-switch-select") return;

      const selectedPuuid = inter.values[0];
      setActiveAccount(interaction.user.id, selectedPuuid);

      const updatedAccounts = getUserAccounts(interaction.user.id);
      collector.resetTimer({ time: 60000, idle: 60000 });

      await inter.update({
        embeds: [buildAccountsEmbed(updatedAccounts)],
        components: [buildSwitchRow(updatedAccounts)],
      });
    });

    collector.on("end", () => {
      const latestAccounts = getUserAccounts(interaction.user.id);
      if (latestAccounts.length > 1) {
        msg
          .edit({
            components: [buildSwitchRow(latestAccounts, true)],
          })
          .catch(() => null);
      }
    });
  }
};

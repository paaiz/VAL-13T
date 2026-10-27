const Command = require("../../structures/Command");
const {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getUser, getWishlist, setDailyStoreDm } = require("../../structures/database/Database");
const { checkAccountStoreAndNotify } = require("../../structures/valorant/util/Notifier");

const VALORANT_EMOJI = "<:valorant_logo:965476928930852864>";

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Manage your daily 07:00 WIB Valorant store & wishlist DM notifications!",
      category: "Valorant",
      categoryEmoji: VALORANT_EMOJI,
      guildOnly: true,
      devMode: true,
      userPerms: [],
      botPerms: [],
      options: [
        {
          name: "daily-store",
          description:
            "Enable or disable receiving your full Daily Store via DM every day at 07:00 AM",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "enabled",
              description: "Send your Daily Store image via DM every day at 07:00 AM?",
              type: ApplicationCommandOptionType.Boolean,
              required: true,
            },
          ],
        },
        {
          name: "status",
          description: "View and toggle your current DM notification settings",
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: "test",
          description: "Send a test store & wishlist notification to your DMs right now",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    });
  }

  async run(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = getUser(interaction.user.id);

    if (!user) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Notification Status: NOT LOGGED IN",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription("You are not logged in! Please run `/login` first."),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const footerData = {
      text: "VAL-13T • Store resets daily at 07:00 AM",
      iconURL: this.client.user.displayAvatarURL(),
    };

    if (sub === "daily-store") {
      const enabled = interaction.options.getBoolean("enabled");
      const updatedAccount = setDailyStoreDm(interaction.user.id, user.puuid, enabled);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: `Daily Store Auto-DM: ${enabled ? "ENABLED" : "DISABLED"}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(
              enabled
                ? `✅ **Daily Store Auto-DM** is now **ENABLED** for **${updatedAccount.username}** (\`${updatedAccount.region.toUpperCase()}\`)!\n\nEvery day at **07:00 AM**, I will automatically send your fresh Daily Store image straight to your Discord DMs.`
                : `❌ **Daily Store Auto-DM** is now **DISABLED** for **${updatedAccount.username}**.\n*(Note: If you have skins in your \`/wishlist\`, you will still receive a DM when a wishlisted skin appears!)*`,
            )
            .setFooter(footerData),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === "test") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const res = await checkAccountStoreAndNotify(this.client, user, {
          forceDm: true,
        });

        if (!res.sent) {
          throw new Error("Could not deliver DM.");
        }

        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setAuthor({
                name: "Notification Test: SUCCESS",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription(
                `📬 Sent a test Daily Store & Wishlist notification to your DMs for **${user.username}**!`,
              )
              .setFooter(footerData),
          ],
        });
      } catch (err) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setAuthor({
                name: "Notification Test: FAILED",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription(
                `Could not send a DM to your account (${err.message}).\nPlease make sure **Allow Direct Messages from server members** is enabled in your Discord Privacy Settings!`,
              )
              .setFooter(footerData),
          ],
        });
      }
    }

    // sub === "status"
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const buildStatusPayload = (disabled = false) => {
      const latestUser = getUser(interaction.user.id) || user;
      const wishlist = getWishlist(interaction.user.id, latestUser.puuid);

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setAuthor({
          name: `Notification Settings: ${latestUser.username} (${latestUser.region.toUpperCase()})`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .addFields(
          {
            name: "📬 Daily Store Auto-DM (07:00 AM)",
            value: latestUser.dailyDm
              ? "**Enabled**. Sends your full Daily Store image every day at reset."
              : "**Disabled**. Use `/notification daily-store enabled:True` or click below to enable.",
            inline: false,
          },
          {
            name: "🎯 Skin Wishlist Alerts",
            value:
              wishlist.length > 0
                ? `**Active**. Tracking **${wishlist.length}** skin${
                    wishlist.length > 1 ? "s" : ""
                  } (manage with \`/wishlist list\`).`
                : "**No skins wishlisted**. Add skins with `/wishlist add` to get notified when they appear.",
            inline: false,
          },
        )
        .setFooter(footerData);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("notif-toggle-dailydm")
          .setStyle(latestUser.dailyDm ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setLabel(
            latestUser.dailyDm ? "Disable Daily Store Auto-DM" : "Enable Daily Store Auto-DM",
          )
          .setEmoji("📬")
          .setDisabled(disabled),
      );

      return { embeds: [embed], components: [row] };
    };

    const msg = await interaction.followUp({
      ...buildStatusPayload(false),
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      time: 60000,
    });

    collector.on("collect", async (inter) => {
      if (inter.customId !== "notif-toggle-dailydm") return;
      collector.resetTimer({ time: 60000, idle: 60000 });

      const currentAcc = getUser(interaction.user.id) || user;
      setDailyStoreDm(interaction.user.id, currentAcc.puuid, !currentAcc.dailyDm);
      await inter.update(buildStatusPayload(false));
    });

    collector.on("end", () => {
      msg.edit(buildStatusPayload(true)).catch(() => null);
    });
  }
};

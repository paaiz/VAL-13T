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

const { getUser, getWishlist, setDailyStoreDm } = require("../../structures/database/Database");
const { checkAccountStoreAndNotify } = require("../../structures/valorant/util/Notifier");

const VALORANT_EMOJI = "<:valorant_logo:965476928930852864>";

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Manage your daily 07:00 AM Valorant store & wishlist DM notifications!",
      category: "Valorant",
      categoryEmoji: VALORANT_EMOJI,
      guildOnly: true,
      devMode: false,
      userPerms: [],
      botPerms: [],
      options: [],
    });
  }

  async run(interaction) {
    const user = getUser(interaction.user.id);

    if (!user) {
      const notLoggedInContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "### Notification Status: NOT LOGGED IN",
              "You are not logged in! Please run `/login` first.",
            ].join("\n"),
          ),
        );

      return interaction.reply({
        components: [notLoggedInContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
    }

    const footerText = "-# VAL-13T • Store resets daily at 07:00 AM";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const buildStatusPayload = (disabled = false) => {
      const latestUser = getUser(interaction.user.id) || user;
      const wishlist = getWishlist(interaction.user.id, latestUser.puuid);

      const container = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Notification Settings: ${latestUser.username} (${latestUser.region.toUpperCase()})`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  "**📬 Daily Store Auto-DM (07:00 AM)**",
                  latestUser.dailyDm
                    ? "**Enabled**. Sends your full Daily Store image every day at reset."
                    : "**Disabled**. Click the button to enable.",
                ].join("\n"),
              ),
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId("notif-toggle-dailydm")
                .setStyle(latestUser.dailyDm ? ButtonStyle.Secondary : ButtonStyle.Success)
                .setLabel(latestUser.dailyDm ? "Disable" : "Enable")
                .setDisabled(disabled),
            ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  "**🎯 Skin Wishlist Alerts**",
                  wishlist.length > 0
                    ? `**Active**. Tracking **${wishlist.length}** skin${
                        wishlist.length > 1 ? "s" : ""
                      } (manage with \`/wishlist list\`).`
                    : "**No skins wishlisted**. Add skins with `/wishlist add` to get notified when they appear.",
                ].join("\n"),
              ),
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId("notif-test-dm")
                .setStyle(ButtonStyle.Primary)
                .setLabel("Send Test DM")
                .setEmoji("📨")
                .setDisabled(disabled),
            ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

      return {
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      };
    };

    const msg = await interaction.followUp({
      ...buildStatusPayload(false),
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (inter) => {
      collector.resetTimer({ time: 60000, idle: 60000 });

      if (inter.customId === "notif-toggle-dailydm") {
        const currentAcc = getUser(interaction.user.id) || user;
        setDailyStoreDm(interaction.user.id, currentAcc.puuid, !currentAcc.dailyDm);
        return inter.update(buildStatusPayload(false));
      }

      if (inter.customId === "notif-test-dm") {
        await inter.deferReply({ flags: MessageFlags.Ephemeral });
        const currentAcc = getUser(interaction.user.id) || user;

        try {
          const res = await checkAccountStoreAndNotify(this.client, currentAcc, {
            forceDm: true,
          });

          if (!res.sent) {
            throw new Error("Could not deliver DM.");
          }

          const successContainer = new ContainerBuilder()
            .setAccentColor(0xff4655)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  "### Notification Test: SUCCESS",
                  `📬 Sent a test Daily Store & Wishlist notification to your DMs for **${currentAcc.username}**!`,
                ].join("\n"),
              ),
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

          return inter.followUp({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } catch (err) {
          const failedContainer = new ContainerBuilder()
            .setAccentColor(0xff4655)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  "### Notification Test: FAILED",
                  `Could not send a DM to your account (${err.message}).`,
                  "Please make sure **Allow Direct Messages from server members** is enabled in your Discord Privacy Settings!",
                ].join("\n"),
              ),
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

          return inter.followUp({
            components: [failedContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      }
    });

    collector.on("end", () => {
      msg.edit(buildStatusPayload(true)).catch(() => null);
    });
  }
};

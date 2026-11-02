const Command = require("../../structures/Command");
const {
  ApplicationCommandOptionType,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const {
  RIOT_AUTH_URL,
  RIOT_SWITCH_AUTH_URL,
  loginWithUrlOrCookie,
} = require("../../structures/valorant/Valorant");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Login with your Riot Games account!",
      category: "Valorant",
      categoryEmoji: "<:valorant_logo:965476928930852864>",
      guildOnly: true,
      devMode: false,
      userPerms: [],
      botPerms: [],
      options: [
        {
          name: "input",
          description: "Optional: Paste your Riot Redirect URL or ssid cookie directly",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    });
  }

  async run(interaction) {
    const input = interaction.options.getString("input");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const footerText = "-# VAL-13T was created by Paiz. Riot Games does not endorse this project.";

    if (!input) {
      const linkButtonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Link Account")
          .setURL(RIOT_AUTH_URL),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Add Account")
          .setURL(RIOT_SWITCH_AUTH_URL),
      );

      const pasteButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId("open_login_modal")
          .setLabel("Paste Redirect URL"),
      );

      const loginGuideContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `### ${this.client.user.username}'s Login Center!`,
              `Link your **Riot Games** account to check your **Valorant Store** directly on Discord.`,
              `**${this.client.user.username}** never asks for or stores your Riot password.`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "**Guide**",
              "- Click **Link Account** to link your first account or **Add Account** to add another account.",
            ].join("\n"),
          ),
        )
        .addActionRowComponents(linkButtonsRow)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "- You will be redirected to the Riot Games login page. Log in with your Riot account.",
              "- Once redirected to a **localhost/error page** that refused to connect (`http://localhost/redirect?iss=...`), **copy the entire URL** from your address bar.",
              "- Click **Paste Redirect URL** below and paste the copied URL!",
            ].join("\n"),
          ),
        )
        .addActionRowComponents(pasteButtonRow)
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

      return interaction.followUp({
        components: [loginGuideContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    try {
      const getValUser = await loginWithUrlOrCookie(interaction.user.id, input);

      const successContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "### Login Status: SUCCESS",
              `Successfully logged in as **${getValUser.username}** (\`${getValUser.region.toUpperCase()}\`)!`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "**Available Commands**",
              "> See /help for a list of all available commands.",
              "",
              "-# Want to unlink your account later? Simply run **/logout** at any time.",
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

      return interaction.followUp({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      this.client.logger.err(`[VALORANT-LOGIN] - ${err.message}`);

      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(["### Login Status: ERROR", err.message].join("\n")),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

      return interaction.followUp({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  }
};

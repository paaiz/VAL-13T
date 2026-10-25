const Command = require("../../structures/Command");
const {
  ApplicationCommandOptionType,
  EmbedBuilder,
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

    const footerData = {
      text: "VAL-13T was created by Paiz. Riot Games does not endorse this project.",
      iconURL: this.client.user.displayAvatarURL(),
    };

    if (!input) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Open Riot Games Login")
          .setURL(RIOT_AUTH_URL),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Switch / Relogin Account")
          .setURL(RIOT_SWITCH_AUTH_URL),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId("open_login_modal")
          .setLabel("Paste Redirect URL")
      );

      const loginGuideEmbed = new EmbedBuilder()
        .setTitle(`${this.client.user.username}'s Login Center!`)
        .setColor("Red")
        .setDescription(
          [
            `Link your **Riot Games** account to check your **Valorant Store** directly on Discord.`,
            `**${this.client.user.username}** never asks for or stores your Riot password.`,
          ].join("\n")
        )
        .addFields(
          {
            name: "Guide",
            value: [
              ">>> **1.** Click **Open Riot Games Login** (or **Switch / Relogin Account** to add another account) and sign in through your browser.",
              "**2.** Once redirected to a 404/blank page (`playvalorant.com/opt_in#access_token=...`), **copy the entire URL** from your address bar.",
              "**3.** Click **Paste Redirect URL** below and paste the copied URL!",
            ].join("\n"),
          }
        )
        .setFooter(footerData);

      return interaction.followUp({
        embeds: [loginGuideEmbed],
        components: [row],
      });
    }

    try {
      const getValUser = await loginWithUrlOrCookie(interaction.user.id, input);

      const successEmbed = new EmbedBuilder()
        .setAuthor({
          name: "Login Status: SUCCESS",
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setColor("Red")
        .setDescription(
          `Successfully logged in as **${getValUser.username}** (\`${getValUser.region.toUpperCase()}\`)!`
        )
        .addFields({
          name: "Available Commands",
          value: [
            "> You can now check your Valorant store using **/store**, **/bundles**, **/accessories**, **/balances**, **/nightmarket**, or switch accounts with **/accounts**.",
            "",
            "Want to unlink your account later? Simply run **/logout** at any time.",
          ].join("\n"),
        })
        .setFooter(footerData);

      return interaction.followUp({
        embeds: [successEmbed],
      });
    } catch (err) {
      this.client.logger.err(`[VALORANT-LOGIN] - ${err.message}`);

      const errorEmbed = new EmbedBuilder()
        .setAuthor({
          name: "Login Status: ERROR",
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setColor("Red")
        .setDescription(err.message)
        .setFooter(footerData);

      return interaction.followUp({
        embeds: [errorEmbed],
      });
    }
  }
};

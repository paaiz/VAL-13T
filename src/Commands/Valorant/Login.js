const Command = require("../../Structures/Command");
const {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  RIOT_AUTH_URL,
  loginWithUrlOrCookie,
} = require("../../Structures/Valorant/Valorant");

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

    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder().setColor("Red");

    if (!input) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("1. Open Riot Games Login")
          .setURL(RIOT_AUTH_URL),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId("open_login_modal")
          .setLabel("2. Paste Redirect URL / Cookie")
      );

      return interaction.followUp({
        embeds: [
          embed
            .setAuthor({
              name: "How to Log In to VAL-13T",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(
              [
                "Follow these **2 quick steps** to link your VALORANT account:",
                "",
                "1️⃣ Click **1. Open Riot Games Login** below and sign in through your browser.",
                "2️⃣ Once redirected to a blank page (`playvalorant.com/opt_in#access_token=...`), **copy the entire URL** from your browser's address bar and click **2. Paste Redirect URL / Cookie** below!",
                "",
                "💡 *Tip: You can also paste your `ssid` cookie value from your browser so your login session can auto-refresh without needing to log in again!*",
              ].join("\n")
            ),
        ],
        components: [row],
      });
    }

    try {
      const getValUser = await loginWithUrlOrCookie(interaction.user.id, input);

      return interaction.followUp({
        embeds: [
          embed
            .setAuthor({
              name: "Login Status: SUCCESS",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(
              `Successfully logged in as **${getValUser.username}** (Region: \`${getValUser.region.toUpperCase()}\`)!\nYou can now use \`/store\`, \`/bundles\`, \`/accessories\`, \`/balances\`, or \`/nightmarket\`.`
            ),
        ],
      });
    } catch (err) {
      console.log(err);
      this.client.logger.err(`[VALORANT-LOGIN] - ${err.message}`);
      return interaction.followUp({
        embeds: [
          embed
            .setAuthor({
              name: "Login Status: ERROR",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(err.message),
        ],
      });
    }
  }
};

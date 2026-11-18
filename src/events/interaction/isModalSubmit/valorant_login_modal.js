const Interaction = require("../../../structures/Interaction");
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");
const { loginWithUrlOrCookie } = require("../../../structures/valorant/Valorant");

module.exports = class extends Interaction {
  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const input = interaction.fields.getTextInputValue("riot_auth_input");
    const footerText =
      "-# VAL-13T was created by Paiz. Riot Games does not endorse this project.";

    try {
      const getValUser = await loginWithUrlOrCookie(interaction.user.id, input);
      const location = interaction.guild ? "" : " (in DM)";
      this.client.logger.cmd(
        `${interaction.user.tag} [${interaction.user.id}] Successfully logged in!${location}`,
      );

      const successContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "### Login Status: SUCCESS",
              `Successfully logged in as **${getValUser.username}** (\`${getValUser.region.toUpperCase()}\`)!`,
              "- See `/help` for a list of all available commands.",
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
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            ["### Login Status: ERROR", err.message].join("\n"),
          ),
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

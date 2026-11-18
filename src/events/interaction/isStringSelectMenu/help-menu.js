const Interaction = require("../../../structures/Interaction");
const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = class extends Interaction {
  async run(interaction) {
    const selectedCategory = interaction.values[0];
    const commandNameList = this.client.commands
      .filter(
        (cmd) =>
          cmd.category.toLowerCase() === selectedCategory.toLowerCase() &&
          cmd.devMode === false,
      )
      .map(
        (cmd) =>
          `\`/${cmd.name}\`\n<:anotha_curve:965498554728742932> ${cmd.description}`,
      );

    const collectorEmbed = new EmbedBuilder()
      .setTitle(
        `${this.client.utils.capitalise(selectedCategory)} Category Command Lists!`,
      )
      .setColor("Red")
      .setDescription(commandNameList.join("\n"));

    await interaction.reply({
      embeds: [collectorEmbed],
      flags: MessageFlags.Ephemeral,
    });
  }
};

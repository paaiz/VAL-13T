const Interaction = require("../../../structures/Interaction");
const { MessageFlags } = require("discord.js");

module.exports = class extends Interaction {
  async run(interaction) {
    await interaction.message.delete();
    await interaction.reply({
      content: "Successfully deleted guild list!",
      flags: MessageFlags.Ephemeral,
    });
  }
};

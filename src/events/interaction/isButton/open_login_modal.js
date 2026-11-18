const Interaction = require("../../../structures/Interaction");
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = class extends Interaction {
  async run(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("valorant_login_modal")
      .setTitle("VAL-13T - Riot Account Login");

    const urlOrCookieInput = new TextInputBuilder()
      .setCustomId("riot_auth_input")
      .setLabel("Paste the Redirect URL from your browser")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("http://localhost/redirect?iss=https%3A%2F%2Fauth.riotgames.com...")
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(urlOrCookieInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
};

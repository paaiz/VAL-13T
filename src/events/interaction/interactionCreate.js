const Event = require("../../structures/Event");
const {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { loginWithUrlOrCookie } = require("../../structures/valorant/Valorant");
const { isUserBlacklisted } = require("../../structures/database/Database");
const { links } = require("../../assets/json/config.json");

module.exports = class extends Event {
  async run(interaction) {
    if (interaction.isAutocomplete()) {
      const command = this.client.commands.get(interaction.commandName);
      if (!command || typeof command.autocomplete !== "function") return;
      if (command.devMode && this.client.config.client?.development !== true) return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        // "Unknown interaction" is common when the user types fast — ignore silently
        if (err?.code !== 10062) console.log(err);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      try {
        const command = this.client.commands.get(interaction.commandName);

        if (!command) {
          return interaction.reply({ content: "Unknown command", flags: MessageFlags.Ephemeral });
        }

        if (command.devMode && this.client.config.client?.development !== true) {
          return interaction.reply({
            content: "Sorry, this command is currently in development and not enabled in production!",
            flags: MessageFlags.Ephemeral,
          });
        }

        const args = [];
        for (const option of interaction.options.data) {
          if (option.type === ApplicationCommandOptionType.Subcommand) {
            if (option.name) {
              args.push(option.name);
            }
            option.options?.forEach((x) => {
              if (x.value) args.push(x.value);
            });
          } else if (option.value) {
            args.push(option.value);
          }
        }

        try {
          const sender = interaction.user;
          this.client.logger.cmd(`${sender.tag} [${sender.id}] Ran: /${command.name}`);
        } catch (err) {
          console.log(err);
        }

        if (isUserBlacklisted(interaction.user.id)) {
          return interaction.reply({
            content: `Sorry, you are currently blacklisted from using **${this.client.user.username}**!\nIf you think this is a mistake, please join our [Support Server](${links.supportInvite}).`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (command.guildOnly && !interaction.guild) {
          return interaction.reply({
            content: "Sorry, this command only works in a Discord Server!",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (command.ownerOnly && !this.client.utils.checkOwner(interaction.user.id)) {
          return interaction.reply({
            content: "Sorry, this command is available to the Creator of the Bot only!",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (interaction.guild) {
          const userPermCheck = command.userPerms
            ? this.client.defaultPerms.add(command.userPerms)
            : this.client.defaultPerms;
          if (userPermCheck) {
            const missing = interaction.channel
              .permissionsFor(interaction.member)
              .missing(userPermCheck);
            const grammarCheck = missing.length > 1 ? "s" : "";
            if (missing.length) {
              return interaction.reply({
                content: `Sorry, you need \`${this.client.utils.formatArray(
                  missing.map(this.client.utils.formatPerms)
                )}\` permission${grammarCheck} to run this slash command!`,
                flags: MessageFlags.Ephemeral,
              });
            }
          }
        }

        interaction.member = interaction.guild.members.cache.get(interaction.user.id);
        await command.run(
          interaction,
          args,
          interaction.options.data.map((value) => value.value)
        );
      } catch (err) {
        console.log(err);

        const errorPayload = {
          content: `Something went wrong when trying to run **/${interaction.commandName}**!`,
          flags: MessageFlags.Ephemeral,
        };
        if (interaction.deferred || interaction.replied) {
          return interaction.followUp(errorPayload);
        }
        return interaction.reply(errorPayload);
      }
    }

    if (interaction.isButton()) {
      try {
        switch (interaction.customId) {
          case "guild_list_delete":
            await interaction.message.delete();
            await interaction.reply({
              content: "Successfully deleted guild list!",
              flags: MessageFlags.Ephemeral,
            });
            break;

          case "open_login_modal": {
            const modal = new ModalBuilder()
              .setCustomId("valorant_login_modal")
              .setTitle("VAL-13T — Riot Account Login");

            const urlOrCookieInput = new TextInputBuilder()
              .setCustomId("riot_auth_input")
              .setLabel("Paste the Redirect URL from your browser")
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder(
                "http://localhost/redirect?code=..."
              )
              .setRequired(true);

            const row = new ActionRowBuilder().addComponents(urlOrCookieInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.log(err);
        this.client.logger.err(`[BUTTON-INTERACTION] - ${err.message}`);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "valorant_login_modal") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const input = interaction.fields.getTextInputValue("riot_auth_input");
        const footerData = {
          text: "VAL-13T was created by Paiz. Riot Games does not endorse this project.",
          iconURL: this.client.user.displayAvatarURL(),
        };

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
          this.client.logger.err(`[VALORANT-MODAL-LOGIN] - ${err.message}`);

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
    }
  }
};

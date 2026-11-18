const Event = require("../../structures/Event");
const { ApplicationCommandOptionType, MessageFlags } = require("discord.js");
const { maybeSendRandomTip } = require("../../structures/valorant/util/BotTips");
const { isUserBlacklisted, logCommandUsage } = require("../../structures/database/Database");
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
            content:
              "Sorry, this command is currently in development and not enabled in production!",
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
          const location = interaction.guild ? "" : " (in DM)";
          this.client.logger.cmd(`${sender.tag} [${sender.id}] Ran: /${command.name}${location}`);
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
                  missing.map(this.client.utils.formatPerms),
                )}\` permission${grammarCheck} to run this slash command!`,
                flags: MessageFlags.Ephemeral,
              });
            }
          }
        }

        interaction.member = interaction.guild?.members.cache.get(interaction.user.id);

        let subcommand = null;
        try {
          subcommand = interaction.options.getSubcommand(false);
        } catch (_) {}
        const trackedName = subcommand ? `/${command.name} ${subcommand}` : `/${command.name}`;

        logCommandUsage(trackedName, interaction.user.id, interaction.guild?.id || null);

        await command.run(
          interaction,
          args,
          interaction.options.data.map((value) => value.value),
        );

        await maybeSendRandomTip(interaction, command.name);
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
      return;
    }

    for (const [folderName, handlersById] of this.client.components.entries()) {
      if (typeof interaction[folderName] === "function" && interaction[folderName]()) {
        const baseCustomId = interaction.customId?.split(":")[0];
        const component =
          handlersById.get(interaction.customId) || handlersById.get(baseCustomId);

        if (component) {
          try {
            await component.run(interaction);
          } catch (err) {
            this.client.logger.err(
              `[${folderName.toUpperCase()}:${interaction.customId}] - ${err.message}`,
            );
          }
        }
        return;
      }
    }
  }
};

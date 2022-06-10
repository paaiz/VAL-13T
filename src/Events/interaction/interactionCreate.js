const Event = require('../../Structures/Event');
const { Interaction } = require('discord.js');

const userSchema = require('../../Structures/Database/Schema/UserSchema');
const { links } = require('../../Assets/JSON/config.json');

module.exports = class extends Event {
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async run(interaction) {
		if (interaction.isCommand()) {
			try {
				const command = this.client.commands.get(interaction.commandName);

				if (!command) {
					return interaction.reply({ content: 'Unknown command', ephemeral: true });
				}

				const args = [];
				for (const option of interaction.options.data) {
					if (option.type === 'SUB_COMMAND') {
						if (option.name) {
							args.push(option.name);
						}
						option.options.forEach((x) => {
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

				const userData = await userSchema.findOne({
					userId: interaction.user.id,
				});

				if (userData?.isBlacklist) {
					return interaction.reply({
						content: `Sorry, you are currently being blacklisted from using **${this.client.user.username}**!\nIf you think that this is a mistake, please join our [Support Server](${links.supportInvite})`,
						ephemeral: true,
					});
				}

				if (command.guildOnly && !interaction.guild) {
					return interaction.reply({ content: 'Sorry, this command only works in Discord Server!', ephemeral: true });
				}

				if (command.ownerOnly && !this.client.utils.checkOwner(interaction.user.id)) {
					return interaction.reply({ content: 'Sorry, this command are available to the Creator of the Bot only!', ephemeral: true });
				}

				if (interaction.guild) {
					const userPermCheck = command.userPerms ? this.client.defaultPerms.add(command.userPerms) : this.client.defaultPerms;
					if (userPermCheck) {
						const missing = interaction.channel.permissionsFor(interaction.member).missing(userPermCheck);
						const grammarCheck = missing.length > 1 ? '' : 's';
						if (missing.length) {
							return interaction.reply({
								content: `Sorry, you need \`${this.client.utils.formatArray(
									missing.map(this.client.utils.formatPerms),
								)}\` permission${grammarCheck} to do this slash command!`,
								ephemeral: true,
							});
						}
					}
				}

				interaction.member = interaction.guild.members.cache.get(interaction.user.id);
				command.run(
					interaction,
					args,
					interaction.options._hoistedOptions.map((value) => value.value),
				);
			} catch (err) {
				console.log(err);

				return interaction.reply({
					content: `Something went wrong when trying to run **${interaction.commandName}** Command!\nPlease report it to the Bot Developer instead. **Paiz#5599**`,
				});
			}
		}

		if (interaction.isButton()) {
			console.log(interaction);
			try {
				if (interaction.user.id !== interaction.message.mentions.repliedUser.id) {
					return interaction.reply({ content: 'Hey, this button is not for you!', ephemeral: true });
				}

				switch (interaction.customId) {
					case 'guild_list_delete':
						await interaction.message.delete();
						interaction.reply({ content: 'Successfully deleted guild list!', ephemeral: true });
						break;

					default:
						break;
				}
			} catch (err) {
				console.log(err);
				this.client.logger.err(`[BUTTON-INTERACTION] - ${err.message}`);
			}
		}
	}
};

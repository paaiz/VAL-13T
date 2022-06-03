const Command = require('../../Structures/Command');
const { CommandInteraction, MessageEmbed } = require('discord.js');

const { deleteUser, getUser } = require('../../Structures/Valorant/Valorant');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Logout your Riot account!',
			category: 'Valorant',
			categoryEmoji: '<:valorant_logo:965476928930852864>',
			guildOnly: true,
			devMode: false,
			userPerms: [],
			botPerms: [],
			options: [],
		});
	}

	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 *
	 */
	async run(interaction, args) {
		const user = getUser(interaction.user.id);

		const embed = new MessageEmbed().setColor('RED');

		if (!user)
			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Logout Status: FAILED', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
						.setDescription("Cannot find your account. Try `/login` if you haven't login!"),
				],
				ephemeral: true,
			});

		try {
			deleteUser(interaction.user.id);

			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Logout Status: SUCCESS', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
						.setDescription(`Successfully logged out for a current user: **${user.username}**`),
				],
				ephemeral: true,
			});
		} catch (err) {
			this.client.logger.err(`[VALORANT-LOGOUT] - ${err.message}`);
			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Logout Status: ERROR', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
						.setDescription(`Something bad happened when trying to logging you out. Try again later!`),
				],
				ephemeral: true,
			});
		}
	}
};

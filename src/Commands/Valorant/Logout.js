const Command = require('../../structures/Command');
const { EmbedBuilder, MessageFlags } = require('discord.js');

const { deleteUser, getUser } = require('../../structures/valorant/Valorant');

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

	async run(interaction) {
		const user = getUser(interaction.user.id);

		const embed = new EmbedBuilder().setColor('Red');

		if (!user)
			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Logout Status: FAILED', iconURL: interaction.user.displayAvatarURL() })
						.setDescription("Cannot find your account. Try `/login` if you haven't logged in!"),
				],
				flags: MessageFlags.Ephemeral,
			});

		try {
			deleteUser(interaction.user.id);

			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Logout Status: SUCCESS', iconURL: interaction.user.displayAvatarURL() })
						.setDescription(`Successfully logged out for user: **${user.username}**`),
				],
				flags: MessageFlags.Ephemeral,
			});
		} catch (err) {
			this.client.logger.err(`[VALORANT-LOGOUT] - ${err.message}`);
			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Logout Status: ERROR', iconURL: interaction.user.displayAvatarURL() })
						.setDescription(`Something bad happened when trying to log you out. Try again later!`),
				],
				flags: MessageFlags.Ephemeral,
			});
		}
	}
};

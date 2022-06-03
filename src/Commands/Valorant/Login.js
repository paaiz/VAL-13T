const Command = require('../../Structures/Command');
const { CommandInteraction, MessageEmbed } = require('discord.js');
const { getValorantUser, getUser } = require('../../Structures/Valorant/Valorant');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Login with your Riot account!',
			category: 'Valorant',
			categoryEmoji: '<:valorant_logo:965476928930852864>',
			guildOnly: true,
			devMode: false,
			userPerms: [],
			botPerms: [],
			options: [
				{
					name: 'username',
					description: 'Your Riot username',
					type: 'STRING',
					required: true,
				},
				{
					name: 'password',
					description: 'Your Riot password',
					type: 'STRING',
					required: true,
				},
			],
		});
	}

	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 *
	 */
	async run(interaction, args) {
		const username = interaction.options.getString('username');
		const password = interaction.options.getString('password');

		await interaction.deferReply({ ephemeral: true });

		const embed = new MessageEmbed().setColor('RED');

		try {
			const getValUser = await getValorantUser(interaction.user.id, username, password);

			if (typeof getValUser === 'object') {
				return interaction.followUp({
					embeds: [
						embed
							.setAuthor({ name: 'Login Status: SUCCESS', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
							.setDescription(`Successfully logged in as **${getValUser.username}**!`),
					],
				});
			} else {
				return interaction.followUp({
					embeds: [
						embed
							.setAuthor({ name: 'Login Status: FAILED', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
							.setDescription(getValUser),
					],
				});
			}
		} catch (err) {
			this.client.logger.err(`[VALORANT-LOGIN] - ${err.message}`);
			return interaction.followUp({
				embeds: [
					embed
						.setAuthor({ name: `Login Status: ERROR`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
						.setDescription(err.message),
				],
			});
		}
	}
};

const Command = require('../../Structures/Command');
const { CommandInteraction, MessageEmbed } = require('discord.js');
const { getValorant2faUser } = require('../../Structures/Valorant/Valorant');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Input your 2FA code if needed',
			category: 'Valorant',
			categoryEmoji: '<:valorant_logo:965476928930852864>',
			guildOnly: true,
			devMode: false,
			userPerms: [],
			botPerms: [],
			options: [
				{
					name: 'code',
					description: 'Input your 2FA code',
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
		const code = interaction.options.getString('code');
		await interaction.deferReply({ ephemeral: true });

		const embed = new MessageEmbed().setColor('RED');

		try {
			const getValUser = await getValorant2faUser(interaction.user.id, code);

			if (typeof getValUser === 'object') {
				return interaction.followUp({
					embeds: [
						embed
							.setAuthor({ name: `Login Status: SUCCESS`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
							.setDescription(`Successfully logged in as **${getValUser.username}**!`),
					],
				});
			} else {
				return interaction.followUp({
					embeds: [
						embed
							.setAuthor({ name: `Login Status: FAILED`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
							.setDescription(getValUser),
					],
				});
			}
		} catch (err) {
			this.client.logger.err(`[VALORANT-2FA] - ${err.message}`);
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

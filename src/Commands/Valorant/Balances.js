const Command = require('../../Structures/Command');
const { CommandInteraction, MessageEmbed } = require('discord.js');

const { getBalances } = require('../../Structures/Valorant/Util/Shop');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Check your current Valorant balances.',
			category: 'Valorant',
			categoryEmoji: '<:valorant_logo:965476928930852864>',
			guildOnly: true,
			devMode: false,
			userPerms: [],
			botPerms: [],
			options: [
				{
					name: 'hide',
					description: 'Hide or unhide your balance to others',
					type: 'BOOLEAN',
					required: false,
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
		let isHidden = interaction.options.getBoolean('hide');
		if (isHidden === null) isHidden = true;

		const embed = new MessageEmbed().setColor('RED');

		try {
			const userBalance = await getBalances(interaction.user.id);

			interaction.reply({
				embeds: [
					embed
						.setAuthor({
							name: `Balances information for: ${userBalance.username}`,
							iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
						})
						.setColor('RED')
						.addField(`<:vp_png:974611751146496020> Valorant Point${userBalance.vp > 1 ? 's' : ''} (VP)`, `${userBalance.vp}`, true)
						.addField(`<:rp_png:974612286041915422> Radianite Point${userBalance.rp > 1 ? 's' : ''} (RP)`, `${userBalance.rp}`, true),
				],
				ephemeral: isHidden,
			});
		} catch (err) {
			this.client.logger.err(`[VALORANT-BALANCE] - ${err.message}`);
			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Balances status: ERROR', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
						.setDescription(err.message),
				],
				ephemeral: true,
			});
		}
	}
};

const Command = require('../../Structures/Command');
const { CommandInteraction, MessageEmbed } = require('discord.js');

const { getDailyStore } = require('../../Structures/Valorant/Util/Shop');
const { generateDailyStoreImage } = require('../../Structures/Valorant/Util/StoreDesign');
const { getUser } = require('../../Structures/Valorant/Valorant');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Fetch your current Valorant store!',
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
		await interaction.deferReply();

		const embed = new MessageEmbed().setColor('RED');

		try {
			const dailyStore = await getDailyStore(interaction.user.id);
			const image = await generateDailyStoreImage(dailyStore);

			const user = getUser(interaction.user.id);

			interaction.followUp({
				embeds: [
					embed
						.setAuthor({
							name: `Store information for: ${user.username}`,
							iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
						})
						.setColor('RED')
						.setDescription(`This store are expired <t:${dailyStore.convertedStoreDuration}:R>`)
						.setImage('attachment://store.png'),
				],
				files: [image],
			});
		} catch (err) {
			this.client.logger.err(`[VALORANT-STORE] - ${err.message}`);
			interaction.followUp({
				embeds: [
					embed
						.setAuthor({ name: 'Store Status: ERROR', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
						.setDescription(err.message),
				],
			});
		}
	}
};

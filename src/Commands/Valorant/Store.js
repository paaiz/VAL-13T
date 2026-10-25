const Command = require('../../Structures/Command');
const { EmbedBuilder } = require('discord.js');

const { getDailyStore } = require('../../Structures/Valorant/Util/Shop');
const { generateDailyStoreImage } = require('../../Structures/Valorant/Util/StoreDesign');
const { getUser } = require('../../Structures/Valorant/Valorant');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Fetch your current Valorant daily store!',
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
		await interaction.deferReply();

		const embed = new EmbedBuilder().setColor('Red');

		try {
			const dailyStore = await getDailyStore(interaction.user.id);
			const image = await generateDailyStoreImage(dailyStore);

			const user = getUser(interaction.user.id);

			await interaction.followUp({
				embeds: [
					embed
						.setAuthor({
							name: `Store information for: ${user.username}`,
							iconURL: interaction.user.displayAvatarURL(),
						})
						.setColor('Red')
						.setDescription(`This store expires <t:${dailyStore.convertedStoreDuration}:R>`)
						.setImage('attachment://store.png'),
				],
				files: [image],
			});
		} catch (err) {
			this.client.logger.err(`[VALORANT-STORE] - ${err.message}`);
			console.log(err);
			await interaction.followUp({
				embeds: [
					embed
						.setAuthor({ name: 'Store Status: ERROR', iconURL: interaction.user.displayAvatarURL() })
						.setDescription(err.message),
				],
			});
		}
	}
};

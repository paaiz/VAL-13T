const Command = require('../../Structures/Command');
const { CommandInteraction, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const { genetareNightMarketImage } = require('../../Structures/Valorant/Util/NightmarketDesign');
const { getUser } = require('../../Structures/Valorant/Valorant');
const { getNightmarket } = require('../../Structures/Valorant/Util/Shop');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Fetch your current Nightmarket in Valorant!',
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
		const embed = new MessageEmbed().setColor('RED');

		try {
			const nightmarketStore = await getNightmarket(interaction.user.id);
			const image = await genetareNightMarketImage(nightmarketStore);

			const user = getUser(interaction.user.id);

			const confirmationButton = new MessageActionRow().addComponents(
				new MessageButton().setStyle('PRIMARY').setLabel("Don't show me!").setCustomId('user-disagree'),
				new MessageButton().setStyle('DANGER').setLabel('Yes, show me!').setCustomId('user-agree'),
			);

			let msg = await interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Nightmarket Status: AWAITING CONFIRMATION', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
						.setDescription(["Are you sure you want to see your month's Nightmarket?"].join('\n'))
						.setFooter({ text: 'This will instantly show all of your current Nightmarket weapon skins!' }),
				],
				fetchReply: true,
				components: [confirmationButton],
			});

			const collector = interaction.channel.createMessageComponentCollector({ componentType: 'BUTTON' });

			collector.on('collect', async (inter) => {
				if (interaction.user.id !== inter.user.id) {
					return inter.reply({
						embeds: [
							embed
								.setAuthor({ name: 'Nightmarket Status: FAILED', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
								.setDescription('Sorry, this button is not for you!')
								.setFooter({ text: '' }),
						],
						ephemeral: true,
					});
				}

				const disabledButton = new MessageActionRow().addComponents(
					confirmationButton.components[0].setDisabled(true),
					confirmationButton.components[1].setDisabled(true),
				);

				switch (inter.customId) {
					case 'user-disagree':
						await inter.reply({ content: "Okay, I won't show you 😁", ephemeral: true });

						await msg.edit({ components: [disabledButton] }).catch((err) => this.client.logger.err(`[NIGHTMARKET] ${err.message}`));

						setTimeout(() => {
							msg.delete();
						}, 2000);

						collector.stop();

						break;
					case 'user-agree':
						await inter.deferReply();

						await inter
							.followUp({
								embeds: [
									embed
										.setAuthor({
											name: `Nightmarket information for: ${user.username}`,
											iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
										})
										.setDescription(`Nightmarket ends <t:${nightmarketStore.convertedNightmarketDuration}:R>`)
										.setImage('attachment://nightmarket.png')
										.setFooter({ text: `Requested by: ${interaction.user.tag}` }),
								],
								files: [image],
							})
							.catch((err) => console.log(err.message));

						await msg.edit({ components: [disabledButton] }).catch((err) => this.client.logger.err(`[NIGHTMARKET] ${err.message}`));

						setTimeout(() => {
							msg.delete();
						}, 2000);

						collector.stop();

						break;
				}
			});
		} catch (err) {
			this.client.logger.err(`[VALORANT-NIGHTMARKET] - ${err.message}`);

			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Nightmarket Status: ERROR', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
						.setDescription(err.message),
				],
				ephemeral: true,
			});
		}
	}
};

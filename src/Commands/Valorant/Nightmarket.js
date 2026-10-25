const Command = require('../../Structures/Command');
const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} = require('discord.js');

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

	async run(interaction) {
		const embed = new EmbedBuilder().setColor('Red');

		try {
			const nightmarketStore = await getNightmarket(interaction.user.id);
			const image = await genetareNightMarketImage(nightmarketStore);

			const user = getUser(interaction.user.id);

			const btnDisagree = new ButtonBuilder()
				.setStyle(ButtonStyle.Primary)
				.setLabel("Don't show me!")
				.setCustomId('user-disagree');
			const btnAgree = new ButtonBuilder()
				.setStyle(ButtonStyle.Danger)
				.setLabel('Yes, show me!')
				.setCustomId('user-agree');

			const confirmationButton = new ActionRowBuilder().addComponents(btnDisagree, btnAgree);

			const msg = await interaction.reply({
				embeds: [
					embed
						.setAuthor({
							name: 'Nightmarket Status: AWAITING CONFIRMATION',
							iconURL: interaction.user.displayAvatarURL(),
						})
						.setDescription("Are you sure you want to see your month's Nightmarket?")
						.setFooter({ text: 'This will instantly show all of your current Nightmarket weapon skins!' }),
				],
				fetchReply: true,
				components: [confirmationButton],
			});

			const collector = msg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 60000,
			});

			collector.on('collect', async (inter) => {
				if (interaction.user.id !== inter.user.id) {
					return inter.reply({
						embeds: [
							new EmbedBuilder()
								.setColor('Red')
								.setAuthor({ name: 'Nightmarket Status: FAILED', iconURL: interaction.user.displayAvatarURL() })
								.setDescription('Sorry, this button is not for you!'),
						],
						ephemeral: true,
					});
				}

				const disabledButton = new ActionRowBuilder().addComponents(
					ButtonBuilder.from(btnDisagree).setDisabled(true),
					ButtonBuilder.from(btnAgree).setDisabled(true),
				);

				switch (inter.customId) {
					case 'user-disagree':
						await inter.reply({ content: "Okay, I won't show you 😁", ephemeral: true });
						await msg.edit({ components: [disabledButton] }).catch(() => null);
						setTimeout(() => msg.delete().catch(() => null), 2000);
						collector.stop();
						break;

					case 'user-agree':
						await inter.deferReply();
						await inter
							.followUp({
								embeds: [
									new EmbedBuilder()
										.setColor('Red')
										.setAuthor({
											name: `Nightmarket information for: ${user.username}`,
											iconURL: interaction.user.displayAvatarURL(),
										})
										.setDescription(`Nightmarket ends <t:${nightmarketStore.convertedNightmarketDuration}:R>`)
										.setImage('attachment://nightmarket.png')
										.setFooter({ text: `Requested by: ${interaction.user.tag}` }),
								],
								files: [image],
							})
							.catch((err) => console.log(err.message));

						await msg.edit({ components: [disabledButton] }).catch(() => null);
						setTimeout(() => msg.delete().catch(() => null), 2000);
						collector.stop();
						break;
				}
			});
		} catch (err) {
			this.client.logger.err(`[VALORANT-NIGHTMARKET] - ${err.message}`);

			return interaction.reply({
				embeds: [
					embed
						.setAuthor({ name: 'Nightmarket Status: ERROR', iconURL: interaction.user.displayAvatarURL() })
						.setDescription(err.message),
				],
				ephemeral: true,
			});
		}
	}
};

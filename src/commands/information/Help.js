const Command = require('../../structures/Command');
const {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ComponentType,
	MessageFlags,
} = require('discord.js');
const { links } = require('../../assets/json/config.json');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Display some information about this bot.',
			category: 'Information',
			categoryEmoji: '<:information:965480660833812493>',
			guildOnly: true,
			devMode: false,
			userPerms: [],
			botPerms: [],
			options: [],
		});
	}

	async run(interaction) {
		try {
			const getUsers = this.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
			const getGuildCount = this.client.guilds.cache.size;

			const getCategory = this.client.utils.removeDupedLabel(
				this.client.commands.map((cmd) => ({
					label: cmd.category,
					value: cmd.category.toLowerCase(),
					description: `Shows you ${cmd.category} category commands!`,
					emoji: cmd.categoryEmoji,
				})),
			);

			const menuComponent = new StringSelectMenuBuilder()
				.setCustomId('help-menu')
				.addOptions(getCategory)
				.setPlaceholder('Select a category!');

			const selectMenu = new ActionRowBuilder().addComponents(menuComponent);

			const mainMenuEmbed = new EmbedBuilder()
				.setTitle(`${this.client.user.username}'s Help Center!`)
				.setColor('Red')
				.setDescription(
					[
						`A short brief. **${this.client.user.username}** allows you to check your current **Valorant Store!**`,
						`I'm currently serving **${getUsers}** users, and I'm in **${getGuildCount}** servers!`,
					].join('\n'),
				)
				.addFields(
					{
						name: 'Guide',
						value: [
							'>>> To check your Valorant store, you must **/login** with your Valorant account first.',
							"After you're successfully logged in, you can use **/store**, **/bundles**, **/accessories**, **/balances**, **/nightmarket**, or **/accounts**.",
						].join('\n'),
					},
					{
						name: 'Useful Links',
						value: [
							`[Invite Me!](${links.botInvite}) | [Support Server](${links.supportInvite}) | [Support Me!](${links.saweria})`,
							'',
							'To see my slash commands, click the select menu below!',
						].join('\n'),
					},
				)
				.setFooter({
					text: 'VAL-13T was created by Paiz. Riot Games does not endorse this project.',
					iconURL: this.client.user.displayAvatarURL(),
				});

			const msg = await interaction.reply({ embeds: [mainMenuEmbed], components: [selectMenu], fetchReply: true });

			const collector = msg.createMessageComponentCollector({
				time: 15000,
				componentType: ComponentType.StringSelect,
			});

			collector.on('collect', async (inter) => {
				await inter.deferReply({ flags: MessageFlags.Ephemeral });

				const commandNameList = this.client.commands
					.filter((cmd) => cmd.category.toLowerCase() === inter.values[0].toLowerCase() && cmd.devMode === false)
					.map((cmd) => `\`/${cmd.name}\`\n<:anotha_curve:965498554728742932> ${cmd.description}`);

				const collectorEmbed = new EmbedBuilder()
					.setTitle(`${this.client.utils.capitalise(inter.values[0])} Category Command Lists!`)
					.setColor('Red')
					.setDescription(commandNameList.join('\n'));

				collector.resetTimer({ time: 15000, idle: 15000 });

				await inter.followUp({ embeds: [collectorEmbed] });
			});

			collector.on('end', () => {
				const disabledMenu = new ActionRowBuilder().addComponents(
					StringSelectMenuBuilder.from(menuComponent)
						.setDisabled(true)
						.setPlaceholder('This select menu has expired!'),
				);

				msg.edit({ embeds: [mainMenuEmbed], components: [disabledMenu] }).catch(() => null);
			});
		} catch (err) {
			this.client.logger.err(`[INFORMATION-HELP] - ${err.message}`);
		}
	}
};

const Command = require('../../structures/Command');
const {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
} = require('discord.js');
const { links } = require('../../assets/json/config.json');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Display some information about this bot.',
			category: 'Information',
			categoryEmoji: '<:information:965480660833812493>',
			guildOnly: false,
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
							"After you're successfully logged in, you can use **/store**, **/wishlist**, **/notification**, **/bundles**, **/accessories**, **/balances**, **/nightmarket**, **/accounts**, or look up any skin with **/skin**.",
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

			await interaction.reply({ embeds: [mainMenuEmbed], components: [selectMenu] });
		} catch (err) {
			this.client.logger.err(`[INFORMATION-HELP] - ${err.message}`);
		}
	}
};

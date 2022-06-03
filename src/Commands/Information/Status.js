const Command = require('../../Structures/Command');
const { CommandInteraction, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: 'Shows you some information about VAL-13T!',
			category: 'Information',
			categoryEmoji: '<:information:965480660833812493>',
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
		try {
			const getUsers = this.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
			const getGuildCount = this.client.guilds.cache.size;
			const getOwners = this.client.config.client.owners
				.map((id) => {
					const user = this.client.users.cache.get(id);

					return user;
				})
				.join(', ');
			const DJSversion = require('discord.js').version;

			const embed = new MessageEmbed()
				.setTitle(`${this.client.user.username} Info`)
				.setColor('RED')
				.setThumbnail(this.client.user.displayAvatarURL())
				.setDescription([`Some general information about **${this.client.user.username}**!`].join('\n'))
				.addField('🌐 Servers', `${getGuildCount}`, true)
				.addField('👥 Users', `${getUsers}`, true)
				.addField('📦 Discord.js', `v${DJSversion}`, true)
				.addField('👩‍💻 Node.js', `${process.version}`, true)
				.addField('🏓 Ping', ` ${Date.now() - interaction.createdTimestamp}ms`, true)
				.addField('👤 Owner(s)', `${getOwners}`, true);

			interaction.reply({
				embeds: [embed],
			});
		} catch (err) {
			this.client.logger.err(`[INFORMATION-STATUS] - ${err.message}`);
		}
	}
};

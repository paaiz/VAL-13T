const Command = require('../../structures/Command');
const { EmbedBuilder } = require('discord.js');

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

	async run(interaction) {
		try {
			const getUsers = this.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
			const getGuildCount = this.client.guilds.cache.size;
			const getOwners = this.client.config.client.owners
				.map((id) => {
					const user = this.client.users.cache.get(id);
					return user ? `${user}` : `<@${id}>`;
				})
				.join(', ');
			const DJSversion = require('discord.js').version;
			const uptimeTimestamp = Math.floor((Date.now() - (this.client.uptime || (process.uptime() * 1000))) / 1000);

			const embed = new EmbedBuilder()
				.setTitle(`${this.client.user.username} Info`)
				.setColor('Red')
				.setThumbnail(this.client.user.displayAvatarURL())
				.setDescription(`Some general information about **${this.client.user.username}**!`)
				.addFields(
					{ name: '🌐 Servers', value: `${getGuildCount}`, inline: true },
					{ name: '👥 Users', value: `${getUsers}`, inline: true },
					{ name: '🏓 Ping', value: `${Math.abs(Date.now() - interaction.createdTimestamp)}ms`, inline: true },
					{ name: '⏱️ Uptime', value: `<t:${uptimeTimestamp}:R>`, inline: true },
					{ name: '📦 Discord.js', value: `v${DJSversion}`, inline: true },
					{ name: '👩‍💻 Node.js', value: `${process.version}`, inline: true },
					{ name: '👤 Owner(s)', value: `${getOwners || 'Paiz'}`, inline: true },
				);

			await interaction.reply({
				embeds: [embed],
			});
		} catch (err) {
			this.client.logger.err(`[INFORMATION-STATUS] - ${err.message}`);
		}
	}
};

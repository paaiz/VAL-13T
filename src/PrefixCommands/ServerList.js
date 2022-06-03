const Command = require('../Structures/PrefixCommand');
const { Message, MessageActionRow, MessageEmbed, MessageButton } = require('discord.js');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			aliases: ['guild_list', 'server_list'],
			guildOnly: true,
			ownerOnly: true,
		});
	}

	/**
	 *
	 * @param {Message} message
	 * @param {String[]} args
	 *
	 */
	async run(message, args) {
		const getServerList = this.client.guilds.cache.map((guild) => {
			return `• [${guild.id}] - ${guild.name} - ${guild.memberCount} Members`;
		});

		const deleteButton = new MessageActionRow().addComponents(
			new MessageButton().setCustomId('guild_list_delete').setStyle('DANGER').setLabel('❌'),
		);

		const embed = new MessageEmbed()
			.setAuthor({ name: `Guild list information for: ${this.client.user.username}`, iconURL: this.client.user.displayAvatarURL() })
			.setTitle(`There are ${this.client.guilds.cache.size} guilds!`)
			.setDescription(['```yaml', `${getServerList.join('\n')}`, '```'].join('\n'))
			.setColor('RED');
		try {
			return await message.reply({ embeds: [embed], components: [deleteButton] });
		} catch (err) {
			this.client.logger.err(`[GUILD-LIST] - ${err.message}`);
		}
	}
};

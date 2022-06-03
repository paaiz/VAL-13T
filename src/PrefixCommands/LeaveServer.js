const Command = require('../Structures/PrefixCommand');
const { Message } = require('discord.js');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			aliases: ['leave_guild', 'leave_server'],
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
		const guild = this.client.guilds.cache.find((guild) => guild.id == args[0]);

		if (!guild) {
			return message.reply({ content: 'No guild found!' });
		}

		try {
			await guild.leave();
			return message.reply({ content: `Successfully leave from **${guild.name}** with id: **${guild.id}**` });
		} catch (err) {
			this.client.logger.err(`[LEAVE-SERVER] [PREFIX-COMMANDS] ${err.message}`);
		}
	}
};

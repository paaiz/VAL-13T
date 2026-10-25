const Command = require('../structures/PrefixCommand');
const { Message } = require('discord.js');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			aliases: ['emit_test'],
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
		const availableEvent = this.client.events.map((r) => r.name).filter((ev) => !['ready', 'messageCreate', 'interactionCreate'].includes(ev));
		const grammarCheck = availableEvent.length > 1 ? 's' : '';

		switch (args[0]) {
			case 'guildCreate':
				await this.client.emit('guildCreate', message.guild);
				message.reply({
					content: `Emitted **${args[0]}** event!`,
				});
				break;
			case 'guildDelete':
				await this.client.emit('guildDelete', message.guild);
				message.reply({
					content: `Emitted **${args[0]}** event`,
				});
				break;
			default:
				return message.reply({
					content: `Cannot find that event! (Sensitive case!)\n\nThere are ${
						availableEvent.length
					} available event${grammarCheck}:\n**${availableEvent.join('\n')}**`,
				});
		}
	}
};
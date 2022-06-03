const Command = require('../Structures/PrefixCommand');
const { Message } = require('discord.js');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			aliases: ['undeploy_test'],
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
		try {
			const msg = await message.reply({ content: '<a:val_dc_load:957192309399760926> Removing slash commands... Please wait!' });

			await message.guild.commands.set([]);

			return msg.edit({ content: `Removed slash commands in **${message.guild.name}**!` });
		} catch (err) {
			this.client.logger.err(`[UNDEPLOY] [PREFIX-COMMAND] ${err.message}`);

			return message.reply({
				content: 'Something bad happened, when trying to run `v-remove`.\nPlease report it to the Bot Developer instead. **Paiz#5599**',
			});
		}
	}
};

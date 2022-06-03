const Command = require('../Structures/PrefixCommand');
const { Message } = require('discord.js');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			aliases: ['deploy_test', 'guild_test'],
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
		const getSlashData = this.client.commands.map((x) => x);

		try {
			const msg = await message.reply({ content: '<a:val_dc_load:957192309399760926> Deploying slash commands... Please wait!' });

			// IF the devMode is true, set to your own guild.
			await this.client.guilds.cache.get('938061902083403848').commands.set(getSlashData);

			return msg.edit({ content: `Deployed slash commands in **${message.guild.name}**!` });
		} catch (err) {
			this.client.logger.err(`[DEPLOY] [PREFIX-COMMAND] ${err.message}`);

			return message.reply({
				content: 'Something bad happened, when trying to run `v-deploy`.\nPlease report it to the Bot Developer instead. **Paiz#5599**',
			});
		}
	}
};

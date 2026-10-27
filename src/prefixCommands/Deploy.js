const Command = require('../structures/PrefixCommand');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			aliases: ['deploy_test', 'guild_test'],
			guildOnly: true,
			ownerOnly: true,
		});
	}

	async run(message) {
		const isDevelopment = this.client.config.client?.development === true;
		const getSlashData = this.client.commands
			.filter((x) => isDevelopment || !x.devMode)
			.map((cmd) => ({
				name: cmd.name,
				description: cmd.description,
				options: cmd.options,
			}));

		try {
			const msg = await message.reply({ content: '<a:val_dc_load:957192309399760926> Deploying slash commands... Please wait!' });

			await message.guild.commands.set(getSlashData);

			return msg.edit({ content: `Deployed slash commands in **${message.guild.name}**!` });
		} catch (err) {
			this.client.logger.err(`[DEPLOY] [PREFIX-COMMAND] ${err.message}`);

			return message.reply({
				content: 'Something bad happened when trying to run `v-deploy`.',
			});
		}
	}
};

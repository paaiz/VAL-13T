const Command = require('../structures/PrefixCommand');
const { Message } = require('discord.js');

const { loadWeaponSkins } = require('../structures/valorant/util/Cache');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			aliases: ['save_valorant_data', 'save_cache'],
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
		await loadWeaponSkins();

		return message.reply({ content: 'Successfully saved new valorant skins!' });
	}
};
const Command = require('../Structures/PrefixCommand');
const { Message } = require('discord.js');

const { loadWeaponSkins } = require('../Structures/Valorant/Util/Cache');

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

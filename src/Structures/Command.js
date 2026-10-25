const { PermissionsBitField } = require('discord.js');

const normalizePerms = (perms = []) => {
	const map = {
		SEND_MESSAGES: PermissionsBitField.Flags.SendMessages,
		VIEW_CHANNEL: PermissionsBitField.Flags.ViewChannel,
		ADMINISTRATOR: PermissionsBitField.Flags.Administrator,
		MANAGE_GUILD: PermissionsBitField.Flags.ManageGuild,
		MANAGE_MESSAGES: PermissionsBitField.Flags.ManageMessages,
	};
	return perms.map((p) => map[p] || PermissionsBitField.Flags[p] || p);
};

module.exports = class Command {
	constructor(client, name, options = {}) {
		this.client = client;
		this.name = options.name || name;
		this.description = options.description || 'No description provided.';
		this.category = options.category || 'Miscellaneous';
		this.categoryEmoji = options.categoryEmoji || null;
		this.userPerms = new PermissionsBitField(normalizePerms(options.userPerms)).freeze();
		this.botPerms = new PermissionsBitField(normalizePerms(options.botPerms)).freeze();
		this.ownerOnly = options.ownerOnly || false;
		this.options = options.options || [];
		this.devMode = options.devMode || false;
		this.guildOnly = options.guildOnly || false;
	}

	async run(interaction, args) {
		throw new Error(`Slash Command ${this.name} doesn't provide a run method!`);
	}
};

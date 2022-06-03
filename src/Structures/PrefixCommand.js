module.exports = class PrefixCommand {
	constructor(client, name, options = {}) {
		this.client = client;
		this.name = options.name || name;
		this.aliases = options.aliases || [];
		this.guildOnly = options.guildOnly || false;
		this.ownerOnly = options.ownerOnly || true;
	}

	async run(message, args) {
		throw new Error(`Command ${this.name} doesn't provide a run method!`);
	}
};

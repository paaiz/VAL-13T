module.exports = class Interaction {
	constructor(client, name, type) {
		this.name = name;
		this.type = type;
		this.client = client;
	}

	async run(interaction) {
		throw new Error(`The run method has not been implemented in ${this.type}/${this.name}`);
	}
};

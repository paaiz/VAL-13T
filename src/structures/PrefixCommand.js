module.exports = class PrefixCommand {
  constructor(client, name, options = {}) {
    this.client = client;
    this.name = options.name || name;
    this.aliases = options.aliases || [];
    this.ownerOnly = options.ownerOnly || false;
    this.guildOnly = options.guildOnly || false;
  }

  async run(message, args) {
    throw new Error(`Command ${this.name} doesn't provide a run method!`);
  }
};

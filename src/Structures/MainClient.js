const { Client, Collection, Permissions } = require('discord.js');
const chalk = require('chalk');

const Util = require('./Util');
const Logger = require('./Logger');
const ConnectDB = require('./Database/Connection');

require('dotenv').config();

module.exports = class MainClient extends Client {
	constructor(options = {}) {
		super({
			allowedMentions: { parse: ['users', 'roles'] },
			intents: 32767,
			partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE'],
		});

		this.validate(options);

		// Commands & Events collection
		this.commands = new Collection();
		this.events = new Collection();
		this.prefixCommands = new Collection();
		this.prefixAliases = new Collection();

		// Function & System
		this.utils = new Util(this);
		this.logger = new Logger();
		this.database = new ConnectDB(this);

		// Config file
		this.config = require('../Assets/JSON/config.json');
	}

	validate(options) {
		if (typeof options.client !== 'object') {
			throw new TypeError(chalk.red('Options type must be an object!'));
		}

		if (!process.env.BOT_TOKEN) {
			throw new Error(chalk.red('Discord Bot token are required!'));
		}
		this.token = process.env.BOT_TOKEN;

		if (!process.env.MONGODB_URI) {
			throw new Error(chalk.red('MongoDB URI are required!'));
		}

		if (!options.client.prefix) {
			throw new Error(chalk.red('Discord Bot prefix are required!'));
		}

		if (typeof options.client.prefix !== 'string') {
			throw new TypeError(chalk.red('Prefix type must be a string!'));
		}

		if (!options.defaultPerms) {
			throw new Error('Default permissions are required for the client!');
		}
		this.defaultPerms = new Permissions(options.defaultPerms).freeze();
	}

	async start(token = this.token) {
		this.utils.loadEvents();
		this.utils.loadPrefixCommands();

		await super.login(token);
	}
};

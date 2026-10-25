const path = require('path');
const { promisify } = require('util');
const glob = promisify(require('glob'));

const Command = require('./Command.js');
const PrefixCommand = require('./PrefixCommand.js');
const Event = require('./Event');

module.exports = class Util {
	constructor(client) {
		this.client = client;
	}

	isClass(input) {
		return typeof input === 'function' && typeof input.prototype === 'object' && input.toString().substring(0, 5) === 'class';
	}

	get directory() {
		return `${path.resolve(__dirname, '..').replace(/\\/g, '/')}/`;
	}

	removeDuplicates(arr) {
		return [...new Set(arr)];
	}

	removeDupedLabel(arr) {
		const uniq = {};
		const arrFiltered = arr.filter((obj) => !uniq[(obj.label, obj.value)] && (uniq[(obj.label, obj.value)] = true));

		return arrFiltered;
	}

	capitalise(string) {
		return string
			.split(' ')
			.map((str) => str.slice(0, 1).toUpperCase() + str.slice(1))
			.join(' ');
	}

	notCapitalise(string) {
		return string
			.split(' ')
			.map((str) => str.slice(0, 1).toLowerCase() + str.slice(1))
			.join(' ');
	}

	checkOwner(target) {
		return this.client.config.client.owners.includes(target);
	}

	trimArray(arr, maxLen = 10) {
		if (arr.length > maxLen) {
			const len = arr.length - maxLen;
			arr = arr.slice(0, maxLen);
			arr.push(`${len} More...`);
		}
		return arr;
	}

	formatBytes(bytes) {
		if (bytes === 0) return '0 Bytes';
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
	}

	formatPerms(perm) {
		return perm
			.toLowerCase()
			.replace(/(^|"|_)(\S)/g, (s) => s.toUpperCase())
			.replace(/_/g, ' ')
			.replace(/Guild/g, 'Server')
			.replace(/Use Vad/g, 'Use Voice Activity');
	}

	formatArray(array, type = 'conjunction') {
		return new Intl.ListFormat('en-GB', { style: 'short', type: type }).format(array);
	}

	categoryCheck(category, message) {
		category = category.toLowerCase();
		switch (category) {
			case 'owner':
				return this.checkOwner(message.author.id);
			case 'nsfw':
				return message.channel.nsfw;
			default:
				return true;
		}
	}

	async loadPrefixCommands() {
		return glob(`${this.directory}PrefixCommands/**/*.js`).then((commands) => {
			for (const commandFile of commands) {
				delete require.cache[commandFile];
				const { name } = path.parse(commandFile);
				const File = require(commandFile);
				if (!this.isClass(File)) throw new TypeError(`Command ${name} doesn't export a class.`);
				const command = new File(this.client, name.toLowerCase());
				if (!(command instanceof PrefixCommand)) throw new TypeError(`Command ${name} doesn't belong in commands.`);
				this.client.prefixCommands.set(command.name, command);
				if (command.aliases.length) {
					for (const alias of command.aliases) {
						this.client.prefixAliases.set(alias, command.name);
					}
				}
			}
		});
	}

	async loadSlashCommands() {
		return glob(`${this.directory}Commands/**/*.js`).then((slashCmd) => {
			for (const slashFile of slashCmd) {
				delete require.cache[slashFile];
				const { name } = path.parse(slashFile);
				const File = require(slashFile);
				if (!this.isClass(File)) throw new TypeError(`Slash Command ${name} doesn't export a class.`);
				const slash = new File(this.client, name.toLowerCase());
				if (!(slash instanceof Command)) throw new TypeError(`Slash Command ${name} doesn't belong in slash commands.`);
				this.client.commands.set(slash.name, slash);
			}
		});
	}

	async loadEvents() {
		return glob(`${this.directory}Events/**/*.js`).then((events) => {
			for (const eventFile of events) {
				delete require.cache[eventFile];
				const { name } = path.parse(eventFile);
				const File = require(eventFile);
				if (!this.isClass(File)) throw new TypeError(`Event ${name} doesn't export a class!`);
				const event = new File(this.client, name);
				if (!(event instanceof Event)) throw new TypeError(`Event ${name} doesn't belong in Events`);
				this.client.events.set(event.name, event);
				event.emitter[event.type](name, (...args) => event.run(...args));
			}
		});
	}
};

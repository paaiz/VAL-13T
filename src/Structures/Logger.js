const chalk = require('chalk');
const moment = require('moment');

module.exports = class Logger {
	get getTime() {
		return `[${new Date().toLocaleString({ timeZone: 'Asia/Jakarta' })}]`;
	}

	ready(content) {
		return console.log(chalk.blue(`[READY] ${this.getTime} : ${content}`));
	}

	warn(content) {
		return console.log(chalk.yellow(`[WARN] ${this.getTime} : ${content}`));
	}

	cmd(content) {
		return console.log(chalk.whiteBright(`[CMD] ${this.getTime} : ${content}`));
	}

	err(content) {
		return console.log(chalk.red(`[ERR] ${this.getTime} : ${content}`));
	}
};

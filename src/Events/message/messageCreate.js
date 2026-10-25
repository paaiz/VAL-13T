const Event = require('../../Structures/Event');
const { EmbedBuilder } = require('discord.js');
const { links } = require('../../Assets/JSON/config.json');

module.exports = class extends Event {
	async run(message) {
		const mentionRegex = new RegExp(`^<@!?${this.client.user.id}>$`);
		const mentionRegexPrefix = new RegExp(`^<@!?${this.client.user.id}> `);

		if (message.author.bot) return;

		if (message.content.match(mentionRegex)) {
			const authorPrefix = message.member?.displayName ? message.member.displayName : message.author.username;

			const mentionedEmbed = new EmbedBuilder()
				.setAuthor({
					name: `Hello, ${authorPrefix}!`,
					iconURL: message.author.displayAvatarURL(),
				})
				.setColor('Red')
				.setDescription(
					[
						`**${this.client.user.username}** allows you to check your current Valorant store via Discord!`,
						`To know more about how to use **${this.client.user.username}**, you can do \`/help\``,
					].join('\n'),
				)
				.addFields({
					name: 'Useful Links',
					value: `[Invite ${this.client.user.username}](${links.botInvite}) | [Support ${this.client.user.username} (IDR)](${links.saweria})`,
				})
				.setFooter({
					text: `${this.client.user.username} was created by Paiz. Riot Games does not endorse this project!`,
					iconURL: this.client.user.displayAvatarURL(),
				});

			try {
				await message.reply({
					embeds: [mentionedEmbed],
				});
			} catch (err) {
				this.client.logger.err(`[MENTION-BOT] - ${err.message}`);
				return message.reply({ content: `An error has occured: \`${err.message}\`` });
			}
		}

		const mainPrefix = message.content.match(mentionRegexPrefix)
			? message.content.match(mentionRegexPrefix)[0]
			: this.client.config.client.prefix;

		if (!message.content.startsWith(mainPrefix)) return;

		const [cmd, ...args] = message.content.slice(mainPrefix.length).trim().split(/ +/g);

		const command =
			this.client.prefixCommands.get(cmd.toLowerCase()) || this.client.prefixCommands.get(this.client.prefixAliases.get(cmd.toLowerCase()));

		if (command) {
			if (command.ownerOnly && !this.client.utils.checkOwner(message.author.id)) {
				return;
			}

			try {
				await command.run(message, args);
			} catch (err) {
				console.log(err);
				this.client.logger.err(`[PREFIX-COMMAND - ${command.name}] ${err.message}`);
			}
		}
	}
};

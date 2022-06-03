const Command = require('../Structures/PrefixCommand');
const { Message, MessageEmbed } = require('discord.js');

const userSchema = require('../Structures/Database/Schema/UserSchema');

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			aliases: ['deploy_test', 'guild_test'],
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
		const embed = new MessageEmbed().setColor('RED');

		switch (args[0]) {
			case 'remove':
				const getBlacklistedUser = this.client.users.cache.find((user) => user.id == args[1]) || message.mentions.users.first();

				if (getBlacklistedUser.bot === true) {
					return message.reply({
						embeds: [
							embed
								.setAuthor({ name: 'Blacklist Status: ERROR', iconURL: this.client.user.displayAvatarURL() })
								.setDescription('You cannot remove blacklist from a user that are a robot!'),
						],
					});
				}

				if (!getBlacklistedUser) {
					return message.reply({
						embeds: [
							embed
								.setAuthor({ name: 'Blacklist Status: ERROR', iconURL: this.client.user.displayAvatarURL() })
								.setDescription('Cannot found user id matched with that user id!'),
						],
					});
				}

				const blacklistedUserData = await userSchema.findOne({
					userId: getBlacklistedUser.id,
				});

				if (!!blacklistedUserData?.isBlacklist === false) {
					return message.reply({
						embeds: [
							embed
								.setAuthor({ name: 'Blacklist Status: FAILED', iconURL: this.client.user.displayAvatarURL() })
								.setDescription('That user are not blacklisted!'),
						],
					});
				}

				await userSchema.findOneAndUpdate({ userId: getBlacklistedUser.id }, { isBlacklist: false });
				message.reply({
					embeds: [
						embed
							.setAuthor({
								name: 'Blacklist Status: SUCCESS',
								iconURL: this.client.user.displayAvatarURL(),
							})
							.setDescription(
								`A user with name **${getBlacklistedUser.username}#${getBlacklistedUser.discriminator}** is no longer blacklisted!`,
							),
					],
				});
				break;
			default:
				const getUser = this.client.users.cache.find((user) => user.id == args[0]) || message.mentions.users.first();

				if (getUser.bot) {
					return message.reply({
						embeds: [
							embed
								.setAuthor({ name: 'Blacklist Status: ERROR', iconURL: this.client.user.displayAvatarURL() })
								.setDescription('You cannot blacklist a robot!'),
						],
					});
				}

				if (!getUser) {
					return message.reply({
						embeds: [
							embed
								.setAuthor({ name: 'Blacklist Status: ERROR', iconURL: this.client.user.displayAvatarURL() })
								.setDescription('Cannot found user id matched with that user id!'),
						],
					});
				}

				const userData = await userSchema.findOne({
					userId: getUser.id,
				});

				if (!userData) {
					await userSchema.create({
						userId: getUser.id,
						isBlacklist: true,
					});

					return message.reply({
						embeds: [
							embed
								.setAuthor({
									name: 'Blacklist Status: SUCCESS',
									iconURL: this.client.user.displayAvatarURL(),
								})
								.setDescription(`A user with name **${getUser.username}#${getUser.discriminator}** are successfully blacklisted!`),
						],
					});
				} else {
					await userSchema.findOneAndUpdate({ userId: getUser.id }, { isBlacklist: true });

					message.reply({
						embeds: [
							embed
								.setAuthor({
									name: 'Blacklist Status: SUCCESS',
									iconURL: this.client.user.displayAvatarURL(),
								})
								.setDescription(`A user with name **${getUser.username}#${getUser.discriminator}** are successfully blacklisted!`),
						],
					});
				}
				break;
		}
	}
};

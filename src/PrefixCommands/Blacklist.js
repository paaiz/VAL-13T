const Command = require('../Structures/PrefixCommand');
const { EmbedBuilder } = require('discord.js');

const userSchema = require('../Structures/Database/Schema/UserSchema');

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      aliases: [],
      guildOnly: true,
      ownerOnly: true,
    });
  }

  async run(message, args) {
    const embed = new EmbedBuilder().setColor('Red');

    switch (args[0]) {
      case 'remove': {
        const getBlacklistedUser =
          this.client.users.cache.find((user) => user.id == args[1]) ||
          message.mentions.users.first();

        if (!getBlacklistedUser) {
          return message.reply({
            embeds: [
              embed
                .setAuthor({
                  name: 'Blacklist Status: ERROR',
                  iconURL: this.client.user.displayAvatarURL(),
                })
                .setDescription('Cannot find user matched with that user id!'),
            ],
          });
        }

        if (getBlacklistedUser.bot) {
          return message.reply({
            embeds: [
              embed
                .setAuthor({
                  name: 'Blacklist Status: ERROR',
                  iconURL: this.client.user.displayAvatarURL(),
                })
                .setDescription('You cannot remove blacklist from a bot!'),
            ],
          });
        }

        const blacklistedUserData = await userSchema.findOne({
          userId: getBlacklistedUser.id,
        });

        if (!blacklistedUserData?.isBlacklist) {
          return message.reply({
            embeds: [
              embed
                .setAuthor({
                  name: 'Blacklist Status: FAILED',
                  iconURL: this.client.user.displayAvatarURL(),
                })
                .setDescription('That user is not blacklisted!'),
            ],
          });
        }

        await userSchema.findOneAndUpdate(
          { userId: getBlacklistedUser.id },
          { isBlacklist: false }
        );
        return message.reply({
          embeds: [
            embed
              .setAuthor({
                name: 'Blacklist Status: SUCCESS',
                iconURL: this.client.user.displayAvatarURL(),
              })
              .setDescription(
                `User **${getBlacklistedUser.tag}** is no longer blacklisted!`
              ),
          ],
        });
      }
      default: {
        const getUser =
          this.client.users.cache.find((user) => user.id == args[0]) ||
          message.mentions.users.first();

        if (!getUser) {
          return message.reply({
            embeds: [
              embed
                .setAuthor({
                  name: 'Blacklist Status: ERROR',
                  iconURL: this.client.user.displayAvatarURL(),
                })
                .setDescription('Cannot find user matched with that user id!'),
            ],
          });
        }

        if (getUser.bot) {
          return message.reply({
            embeds: [
              embed
                .setAuthor({
                  name: 'Blacklist Status: ERROR',
                  iconURL: this.client.user.displayAvatarURL(),
                })
                .setDescription('You cannot blacklist a bot!'),
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
        } else {
          await userSchema.findOneAndUpdate(
            { userId: getUser.id },
            { isBlacklist: true }
          );
        }

        return message.reply({
          embeds: [
            embed
              .setAuthor({
                name: 'Blacklist Status: SUCCESS',
                iconURL: this.client.user.displayAvatarURL(),
              })
              .setDescription(
                `User **${getUser.tag}** is successfully blacklisted!`
              ),
          ],
        });
      }
    }
  }
};

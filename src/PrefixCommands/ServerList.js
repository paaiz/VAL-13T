const Command = require('../Structures/PrefixCommand');
const {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      aliases: ['guild_list', 'server_list'],
      guildOnly: true,
      ownerOnly: true,
    });
  }

  async run(message) {
    const getServerList = this.client.guilds.cache.map((guild) => {
      return `• [${guild.id}] - ${guild.name} - ${guild.memberCount} Members`;
    });

    const buttonNext = new ButtonBuilder()
      .setCustomId('next-page')
      .setEmoji('1010216829916033134')
      .setStyle(ButtonStyle.Primary);
    const deleteMessage = new ButtonBuilder()
      .setCustomId('delete-page')
      .setEmoji('982229004763410492')
      .setStyle(ButtonStyle.Danger);
    const buttonPrevious = new ButtonBuilder()
      .setCustomId('previous-page')
      .setEmoji('1010216904457211944')
      .setStyle(ButtonStyle.Primary);

    const chunkArrayToGroups = (array = [], size = 10) => {
      const result = [];
      let position = 0;

      while (position < array.length) {
        result.push(array.slice(position, position + size));
        position += size;
      }

      return result;
    };

    const groupedArr = chunkArrayToGroups(getServerList);
    const fitOnOnePage = getServerList.length <= 10;

    let currentPage = 0;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Guild list information for: ${this.client.user.username}`,
        iconURL: this.client.user.displayAvatarURL(),
      })
      .setTitle(`There are ${getServerList.length} guilds!`)
      .setDescription(`\`\`\`yaml\n${groupedArr[0].join('\n')} \`\`\``)
      .setColor('Red')
      .setFooter({
        text: `Page ${currentPage + 1}/${groupedArr.length}`,
        iconURL: message.guild.iconURL() || undefined,
      });

    const row = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(buttonPrevious).setDisabled(true),
      deleteMessage,
      buttonNext
    );

    const msg = await message.reply({
      embeds: [embed],
      components: fitOnOnePage ? [] : [row],
    });

    if (fitOnOnePage) return;

    const filter = (interaction) => {
      if (interaction.user.id !== message.author.id) {
        interaction.reply({
          content: 'This button is not for you!',
          ephemeral: true,
        });
        return false;
      }
      return true;
    };

    const collector = msg.createMessageComponentCollector({
      filter,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'delete-page') {
        return await msg.delete().catch(() => null);
      }

      interaction.customId === 'previous-page'
        ? (currentPage -= 1)
        : (currentPage += 1);

      const boolRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(buttonPrevious).setDisabled(!currentPage),
        deleteMessage,
        ButtonBuilder.from(buttonNext).setDisabled(!groupedArr[currentPage + 1])
      );

      await interaction.update({
        embeds: [
          embed
            .setDescription(
              `\`\`\`yaml\n${groupedArr[currentPage].join('\n')} \`\`\``
            )
            .setFooter({
              iconURL: message.guild.iconURL() || undefined,
              text: `Page ${currentPage + 1}/${groupedArr.length}`,
            }),
        ],
        components: [boolRow],
      });
    });

    collector.on('end', () => {
      const disabled = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(buttonPrevious).setDisabled(true),
        ButtonBuilder.from(buttonNext).setDisabled(true)
      );

      if (!msg.deletable) return;

      msg.edit({ embeds: [embed], components: [disabled] }).catch(() => null);
    });
  }
};

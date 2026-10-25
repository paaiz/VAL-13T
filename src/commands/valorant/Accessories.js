const Command = require("../../structures/Command");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require("discord.js");
const { getAccessoryStore } = require("../../structures/valorant/util/Shop");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Check your weekly Accessory Store rotation (Kingdom Credits)!",
      category: "Valorant",
      categoryEmoji: "<:valorant_logo:965476928930852864>",
      guildOnly: true,
      devMode: false,
      userPerms: [],
      botPerms: [],
      options: [],
    });
  }

  async run(interaction) {
    await interaction.deferReply();

    try {
      const { username, expiresAt, items } = await getAccessoryStore(interaction.user.id);

      let currentPage = 0;

      const buildPageEmbed = (pageIndex) => {
        const item = items[pageIndex];
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setAuthor({
            name: `Accessory Store information for: ${username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTitle(`${item.name}`)
          .setDescription(`Accessory Store rotation expires <t:${expiresAt}:R>`)
          .addFields(
            {
              name: "🏷️ Type",
              value: `${item.type}`,
              inline: true,
            },
            {
              name: "<:kc_png:1563849730491154563> Price",
              value: `**${item.costKC.toLocaleString()} KC**`,
              inline: true,
            },
          )
          .setFooter({
            text: `Page ${pageIndex + 1}/${items.length}`,
            iconURL: this.client.user.displayAvatarURL(),
          });

        if (item.icon) {
          embed.setThumbnail(item.icon);
        }

        return embed;
      };

      const buildActionRow = (pageIndex, disabled = false) => {
        const item = items[pageIndex];

        const prevBtn = new ButtonBuilder()
          .setCustomId("acc-prev")
          .setEmoji("1010216904457211944")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || pageIndex === 0);

        const nextBtn = new ButtonBuilder()
          .setCustomId("acc-next")
          .setEmoji("1010216829916033134")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || pageIndex >= items.length - 1);

        const components = [prevBtn, nextBtn];

        if (item.previewUrl) {
          components.push(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel(item.type === "Player Card" ? "Full Card" : "Full Preview")
              .setURL(item.previewUrl),
          );
        }

        if (item.bannerUrl) {
          components.push(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel("Wide Banner")
              .setURL(item.bannerUrl),
          );
        }

        return new ActionRowBuilder().addComponents(components);
      };

      const msg = await interaction.followUp({
        embeds: [buildPageEmbed(currentPage)],
        components: [buildActionRow(currentPage)],
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      collector.on("collect", async (inter) => {
        if (inter.user.id !== interaction.user.id) {
          return inter.reply({
            content: "Sorry, this button is not for you!",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (inter.customId === "acc-prev" && currentPage > 0) {
          currentPage -= 1;
        } else if (inter.customId === "acc-next" && currentPage < items.length - 1) {
          currentPage += 1;
        }

        collector.resetTimer({ time: 60000, idle: 60000 });

        await inter.update({
          embeds: [buildPageEmbed(currentPage)],
          components: [buildActionRow(currentPage)],
        });
      });

      collector.on("end", () => {
        msg
          .edit({
            embeds: [buildPageEmbed(currentPage)],
            components: [buildActionRow(currentPage, true)],
          })
          .catch(() => null);
      });
    } catch (err) {
      this.client.logger.err(`[VALORANT-ACCESSORIES] - ${err.message}`);
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Accessory Store Status: ERROR",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(err.message),
        ],
      });
    }
  }
};

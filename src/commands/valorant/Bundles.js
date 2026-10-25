const Command = require("../../structures/Command");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
} = require("discord.js");
const { getFeaturedBundles } = require("../../structures/valorant/util/Shop");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Check the active Featured Bundles in your Valorant Store!",
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
      const { username, bundles } = await getFeaturedBundles(interaction.user.id);
      const hasMultipleBundles = bundles.length > 1;

      let viewMode = "overview"; // "overview" | "detail"
      let currentBundleIndex = 0;
      let currentItemIndex = 0;

      const buildOverviewEmbed = (bundleIdx) => {
        const bundle = bundles[bundleIdx];
        const items = bundle.items || [];

        const priceValue =
          bundle.basePrice && bundle.basePrice > bundle.price
            ? `**${bundle.price.toLocaleString()} VP** (~~${bundle.basePrice.toLocaleString()} VP~~)`
            : `**${bundle.price.toLocaleString()} VP**`;

        const embed = new EmbedBuilder()
          .setColor("Red")
          .setAuthor({
            name: `Featured Bundle information for: ${username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTitle(bundle.name)
          .setDescription(`Featured Bundle expires <t:${bundle.expiresAt}:R>`)
          .addFields(
            {
              name: "<:vp_png:974611751146496020> Bundle Price",
              value: priceValue,
              inline: true,
            },
            {
              name: "📦 Total Items",
              value: `**${items.length} Items**`,
              inline: true,
            },
          );

        if (bundle.image) {
          embed.setImage(bundle.image);
        }

        if (hasMultipleBundles) {
          embed.setFooter({
            text: `Page ${bundleIdx + 1}/${bundles.length}`,
            iconURL: this.client.user.displayAvatarURL(),
          });
        }

        return embed;
      };

      const buildOverviewComponents = (bundleIdx, disabled = false) => {
        const rows = [];

        if (hasMultipleBundles) {
          const prevBtn = new ButtonBuilder()
            .setCustomId("bundle-prev")
            .setEmoji("1010216904457211944")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || bundleIdx === 0);

          const nextBtn = new ButtonBuilder()
            .setCustomId("bundle-next")
            .setEmoji("1010216829916033134")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || bundleIdx >= bundles.length - 1);

          rows.push(new ActionRowBuilder().addComponents(prevBtn, nextBtn));
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("bundle-select-detail")
          .setPlaceholder(
            disabled ? "This menu has expired!" : "Select a bundle to view included items!",
          )
          .setDisabled(disabled)
          .addOptions(
            bundles.map((b, idx) => ({
              label: b.name,
              value: String(idx),
              description: `View all ${(b.items || []).length} items in ${b.name}`,
              emoji: "<:valorant_logo:965476928930852864>",
            })),
          );

        rows.push(new ActionRowBuilder().addComponents(selectMenu));
        return rows;
      };

      const buildDetailEmbed = (bundleIdx, itemIdx) => {
        const bundle = bundles[bundleIdx];
        const items = bundle.items || [];
        const item = items[itemIdx];

        const embed = new EmbedBuilder()
          .setColor("Red")
          .setAuthor({
            name: `Detailed information for: ${bundle.name}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTitle(`${item.name}`)
          .setDescription(`Featured Bundle expires <t:${bundle.expiresAt}:R>`)
          .addFields(
            {
              name: "🏷️ Type",
              value: `${item.type}`,
              inline: true,
            },
            {
              name: "<:vp_png:974611751146496020> Individual Price",
              value: `**${item.basePrice.toLocaleString()} VP**`,
              inline: true,
            },
          )
          .setFooter({
            text: `Page ${itemIdx + 1}/${items.length} • ${bundle.name}`,
            iconURL: this.client.user.displayAvatarURL(),
          });

        if (item.icon) {
          embed.setThumbnail(item.icon);
        }

        return embed;
      };

      const buildDetailComponents = (bundleIdx, itemIdx, disabled = false) => {
        const bundle = bundles[bundleIdx];
        const items = bundle.items || [];
        const item = items[itemIdx];

        const backBtn = new ButtonBuilder()
          .setCustomId("bundle-back-overview")
          .setLabel("Back to Bundle")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled);

        const prevBtn = new ButtonBuilder()
          .setCustomId("bundle-item-prev")
          .setEmoji("1010216904457211944")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || itemIdx === 0);

        const nextBtn = new ButtonBuilder()
          .setCustomId("bundle-item-next")
          .setEmoji("1010216829916033134")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || itemIdx >= items.length - 1);

        const buttons = [backBtn, prevBtn, nextBtn];

        if (item.previewUrl) {
          buttons.push(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel(item.type === "Player Card" ? "Full Card" : "Full Preview")
              .setURL(item.previewUrl),
          );
        }

        if (item.bannerUrl) {
          buttons.push(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel("Wide Banner")
              .setURL(item.bannerUrl),
          );
        }

        const rows = [new ActionRowBuilder().addComponents(buttons)];

        if (item.video) {
          const levels =
            item.videos && item.videos.length > 0
              ? item.videos
              : [{ name: item.name, video: item.video }];

          const videoSelect = new StringSelectMenuBuilder()
            .setCustomId("bundle-video-select")
            .setPlaceholder(
              disabled
                ? "This video preview menu has expired!"
                : `Watch ${item.name} video preview!`,
            )
            .setDisabled(disabled)
            .addOptions(
              levels.map((lvl, idx) => ({
                label: lvl.name.slice(0, 100),
                value: String(idx),
                description: `Watch Level ${idx + 1} video preview (Only visible to you)`,
                emoji: "<:valorant_logo:965476928930852864>",
              })),
            );

          rows.push(new ActionRowBuilder().addComponents(videoSelect));
        }

        return rows;
      };

      const msg = await interaction.followUp({
        embeds: [buildOverviewEmbed(currentBundleIndex)],
        components: buildOverviewComponents(currentBundleIndex),
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        time: 60000,
      });

      collector.on("collect", async (inter) => {
        if (inter.isStringSelectMenu() && inter.customId === "bundle-video-select") {
          collector.resetTimer({ time: 60000, idle: 60000 });
          const bundle = bundles[currentBundleIndex];
          const item = (bundle.items || [])[currentItemIndex];
          if (!item || !item.video) return;

          const levels =
            item.videos && item.videos.length > 0
              ? item.videos
              : [{ name: item.name, video: item.video }];

          const chosenIdx = Number(inter.values[0]) || 0;
          const chosen = levels[chosenIdx] || levels[levels.length - 1];

          return inter.reply({
            content: `[🎥 **Video Preview — ${chosen.name}**](${chosen.video})`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (inter.user.id !== interaction.user.id) {
          return inter.reply({
            content: "Sorry, this menu/button is not for you!",
            flags: MessageFlags.Ephemeral,
          });
        }

        collector.resetTimer({ time: 60000, idle: 60000 });

        if (inter.isStringSelectMenu() && inter.customId === "bundle-select-detail") {
          currentBundleIndex = Number(inter.values[0]) || 0;
          currentItemIndex = 0;
          viewMode = "detail";

          return inter.update({
            embeds: [buildDetailEmbed(currentBundleIndex, currentItemIndex)],
            components: buildDetailComponents(currentBundleIndex, currentItemIndex),
          });
        }

        if (inter.isButton()) {
          if (inter.customId === "bundle-prev" && currentBundleIndex > 0) {
            currentBundleIndex -= 1;
            return inter.update({
              embeds: [buildOverviewEmbed(currentBundleIndex)],
              components: buildOverviewComponents(currentBundleIndex),
            });
          }

          if (inter.customId === "bundle-next" && currentBundleIndex < bundles.length - 1) {
            currentBundleIndex += 1;
            return inter.update({
              embeds: [buildOverviewEmbed(currentBundleIndex)],
              components: buildOverviewComponents(currentBundleIndex),
            });
          }

          if (inter.customId === "bundle-back-overview") {
            viewMode = "overview";
            return inter.update({
              embeds: [buildOverviewEmbed(currentBundleIndex)],
              components: buildOverviewComponents(currentBundleIndex),
            });
          }

          const items = bundles[currentBundleIndex].items || [];

          if (inter.customId === "bundle-item-prev" && currentItemIndex > 0) {
            currentItemIndex -= 1;
            return inter.update({
              embeds: [buildDetailEmbed(currentBundleIndex, currentItemIndex)],
              components: buildDetailComponents(currentBundleIndex, currentItemIndex),
            });
          }

          if (inter.customId === "bundle-item-next" && currentItemIndex < items.length - 1) {
            currentItemIndex += 1;
            return inter.update({
              embeds: [buildDetailEmbed(currentBundleIndex, currentItemIndex)],
              components: buildDetailComponents(currentBundleIndex, currentItemIndex),
            });
          }
        }
      });

      collector.on("end", () => {
        if (viewMode === "overview") {
          msg
            .edit({
              embeds: [buildOverviewEmbed(currentBundleIndex)],
              components: buildOverviewComponents(currentBundleIndex, true),
            })
            .catch(() => null);
        } else {
          msg
            .edit({
              embeds: [buildDetailEmbed(currentBundleIndex, currentItemIndex)],
              components: buildDetailComponents(currentBundleIndex, currentItemIndex, true),
            })
            .catch(() => null);
        }
      });
    } catch (err) {
      this.client.logger.err(`[VALORANT-BUNDLES] - ${err.message}`);
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Bundles Status: ERROR",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(err.message),
        ],
      });
    }
  }
};

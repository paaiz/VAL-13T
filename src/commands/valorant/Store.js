const Command = require("../../structures/Command");
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
} = require("discord.js");

const { getDailyStore } = require("../../structures/valorant/util/Shop");
const { generateDailyStoreImage } = require("../../structures/valorant/util/StoreDesign");
const { getUser } = require("../../structures/valorant/Valorant");

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Fetch your current Valorant daily store!",
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

    const embed = new EmbedBuilder().setColor("Red");

    try {
      const dailyStore = await getDailyStore(interaction.user.id);
      const image = await generateDailyStoreImage(dailyStore);

      const user = getUser(interaction.user.id);

      const storeSkins = [
        dailyStore["skin_1"],
        dailyStore["skin_2"],
        dailyStore["skin_3"],
        dailyStore["skin_4"],
      ].filter((skin) => Boolean(skin && skin.video));

      const buildSelectMenu = (disabled = false) => {
        const menu = new StringSelectMenuBuilder()
          .setCustomId("store-video-select")
          .setPlaceholder(
            disabled
              ? "This video preview menu has expired!"
              : "Select a weapon skin to watch video preview!",
          )
          .setDisabled(disabled)
          .addOptions(
            storeSkins.map((skin, idx) => ({
              label: skin.name,
              value: String(idx),
              description: `Watch ${skin.name} video preview (${skin.videos?.length || 1} level${
                (skin.videos?.length || 1) > 1 ? "s" : ""
              })`,
              emoji: "<:valorant_logo:965476928930852864>",
            })),
          );

        return new ActionRowBuilder().addComponents(menu);
      };

      const storeEmbed = embed
        .setAuthor({
          name: `Store information for: ${user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setColor("Red")
        .setDescription(`This store expires <t:${dailyStore.convertedStoreDuration}:R>`)
        .setImage("attachment://store.png");

      const msg = await interaction.followUp({
        embeds: [storeEmbed],
        files: [image],
        components: storeSkins.length > 0 ? [buildSelectMenu(false)] : [],
        fetchReply: true,
      });

      if (storeSkins.length === 0) return;

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
      });

      collector.on("collect", async (inter) => {
        if (inter.customId !== "store-video-select") return;

        collector.resetTimer({ time: 60000, idle: 60000 });

        const selectedIdx = Number(inter.values[0]) || 0;
        const selectedSkin = storeSkins[selectedIdx];

        if (!selectedSkin || !selectedSkin.video) {
          return inter.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setAuthor({
                  name: `Video Preview: ${selectedSkin ? selectedSkin.name : "Unknown"}`,
                  iconURL: inter.user.displayAvatarURL(),
                })
                .setDescription("Sorry, this weapon skin does not have an upgrade video preview!")
                .setThumbnail(selectedSkin?.image || null),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const levels =
          selectedSkin.videos && selectedSkin.videos.length > 0
            ? selectedSkin.videos
            : [{ name: selectedSkin.name, video: selectedSkin.video }];

        const defaultLevel = levels[levels.length - 1];

        if (levels.length === 1) {
          return inter.reply({
            content: `[🎥 **Video Preview — ${defaultLevel.name}**](${defaultLevel.video})`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const buildLevelRow = (activeIdx) =>
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("store-video-level")
              .setPlaceholder(`Viewing: ${levels[activeIdx].name}`)
              .addOptions(
                levels.map((lvl, idx) => ({
                  label: lvl.name.slice(0, 100),
                  value: String(idx),
                  description: `Watch Level ${idx + 1} video preview`,
                  default: idx === activeIdx,
                  emoji: "<:valorant_logo:965476928930852864>",
                })),
              ),
          );

        const previewMsg = await inter.reply({
          content: `[🎥 **Video Preview — ${defaultLevel.name}**](${defaultLevel.video})`,
          components: [buildLevelRow(levels.length - 1)],
          flags: MessageFlags.Ephemeral,
          fetchReply: true,
        });

        const levelCollector = previewMsg.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 60000,
        });

        levelCollector.on("collect", async (lvlInter) => {
          const lvlIdx = Number(lvlInter.values[0]) || 0;
          const chosen = levels[lvlIdx] || defaultLevel;
          levelCollector.resetTimer({ time: 60000, idle: 60000 });

          await lvlInter.update({
            content: `[🎥 **Video Preview — ${chosen.name}**](${chosen.video})`,
            components: [buildLevelRow(lvlIdx)],
          });
        });
      });

      collector.on("end", () => {
        msg
          .edit({
            components: [buildSelectMenu(true)],
          })
          .catch(() => null);
      });
    } catch (err) {
      this.client.logger.err(`[VALORANT-STORE] - ${err.message}`);
      console.log(err);
      await interaction.followUp({
        embeds: [
          embed
            .setAuthor({
              name: "Store Status: ERROR",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(err.message),
        ],
      });
    }
  }
};

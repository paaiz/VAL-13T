const Command = require("../../structures/Command");
const {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require("discord.js");

const skinTier = require("../../assets/json/tier.json");
const {
  searchSkins,
  getSkinIndex,
  loadWeaponSkins,
} = require("../../structures/valorant/util/Cache");
const { getOfferPrices, getTierIMG } = require("../../structures/valorant/util/Shop");

const VP_EMOJI = "<:vp_png:974611751146496020>";
const VALORANT_EMOJI = "<:valorant_logo:965476928930852864>";

const getTierInfo = (tierUuid) => {
  const tier = skinTier.data.find((t) => t.uuid === tierUuid);
  return {
    name: tier?.devName || "Unknown",
    icon: getTierIMG(tierUuid),
    // highlightColor is RRGGBBAA — drop the alpha for the embed color
    color: tier?.highlightColor ? parseInt(tier.highlightColor.slice(0, 6), 16) : 0xff4655,
  };
};

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Look up any Valorant weapon skin, price, tier, chromas & video previews!",
      category: "Valorant",
      categoryEmoji: VALORANT_EMOJI,
      guildOnly: true,
      devMode: false,
      userPerms: [],
      botPerms: [],
      options: [
        {
          name: "name",
          description: "The weapon skin you want to look up",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    });
  }

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused() || "";
    const results = searchSkins(focused, 25);
    await interaction.respond(
      results.map((skin) => ({
        name: skin.name.slice(0, 100),
        value: skin.uuid,
      })),
    );
  }

  async run(interaction) {
    const input = interaction.options.getString("name");
    await interaction.deferReply();

    const footerData = {
      text: "VAL-13T was created by Paiz. Riot Games does not endorse this project.",
      iconURL: this.client.user.displayAvatarURL(),
    };

    let index = getSkinIndex();
    if (!index.length || index[0].source === undefined) {
      await loadWeaponSkins();
      index = getSkinIndex();
    }

    // Autocomplete sends the UUID; a manually typed name falls back to search
    const skin = index.find((s) => s.uuid === input) || searchSkins(input, 1)[0];

    if (!skin) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Skin Lookup: NOT FOUND",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(
              `Couldn't find any weapon skin matching **${input}**. Try picking one from the suggestions!`,
            )
            .setFooter(footerData),
        ],
      });
    }

    const tier = getTierInfo(skin.tier);
    const prices = await getOfferPrices();
    const observedPrice = prices?.offers?.[skin.uuid];

    let priceText;
    if (observedPrice !== undefined) {
      priceText = `${VP_EMOJI} **${observedPrice.toLocaleString("en-US")}** VP`;
    } else if (skin.source === "battlepass") {
      priceText = `${VP_EMOJI} **1,000** VP *(Battle Pass)*`;
    } else if (skin.source === "agent") {
      priceText = "**Agent Contract**";
    } else if (skin.source === "event") {
      priceText = "**Event Pass**";
    } else if (skin.price) {
      priceText = `${VP_EMOJI} **${skin.price.toLocaleString("en-US")}** VP`;
    } else {
      priceText = "Not sold in the store";
    }

    const chromas = skin.chromas?.length
      ? skin.chromas
      : [{ name: skin.name, image: skin.icon, video: null }];
    const videos = skin.videos || [];

    const buildEmbed = (chromaIdx) => {
      const chroma = chromas[chromaIdx] || chromas[0];
      return new EmbedBuilder()
        .setColor(tier.color)
        .setAuthor({ name: "Skin Information", iconURL: interaction.user.displayAvatarURL() })
        .setTitle(skin.name)
        .setThumbnail(tier.icon)
        .addFields(
          { name: "Tier", value: tier.name, inline: true },
          { name: "Price", value: priceText, inline: true },
          { name: "\u200b", value: "\u200b", inline: true },
          { name: "Upgrade Levels", value: String(skin.levelCount), inline: true },
          { name: "Chromas", value: String(chromas.length), inline: true },
          {
            name: "Video Previews",
            value: videos.length ? String(videos.length) : "None",
            inline: true,
          },
        )
        .setImage(chroma.image || skin.icon)
        .setFooter({
          text: chromas.length > 1 ? `${footerData.text}` : footerData.text,
          iconURL: footerData.iconURL,
        });
    };

    const buildComponents = (chromaIdx, disabled = false) => {
      const rows = [];
      const chroma = chromas[chromaIdx] || chromas[0];

      if (chromas.length > 1) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("skin-chroma-select")
              .setPlaceholder(
                disabled ? "This menu has expired!" : "Select a chroma variant to preview!",
              )
              .setDisabled(disabled)
              .addOptions(
                chromas.slice(0, 25).map((c, idx) => ({
                  label: c.name.slice(0, 100),
                  value: String(idx),
                  default: idx === chromaIdx,
                  emoji: VALORANT_EMOJI,
                })),
              ),
          ),
        );
      }

      if (videos.length) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("skin-video-select")
              .setPlaceholder(
                disabled ? "This menu has expired!" : "Select a level to watch its video preview!",
              )
              .setDisabled(disabled)
              .addOptions(
                videos.slice(0, 25).map((v, idx) => ({
                  label: v.name.slice(0, 100),
                  value: String(idx),
                  description: `Watch Level ${idx + 1} video preview`,
                  emoji: VALORANT_EMOJI,
                })),
              ),
          ),
        );
      }

      return rows;
    };

    let activeChroma = 0;
    const msg = await interaction.followUp({
      embeds: [buildEmbed(activeChroma)],
      components: buildComponents(activeChroma),
      fetchReply: true,
    });

    if (chromas.length <= 1 && !videos.length) return;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    collector.on("collect", async (inter) => {
      collector.resetTimer({ time: 60000, idle: 60000 });

      if (inter.customId === "skin-video-select") {
        const video = videos[Number(inter.values[0]) || 0];
        return inter.reply({
          content: `[🎥 **Video Preview — ${video.name}**](${video.video})`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (inter.customId === "skin-chroma-select") {
        if (inter.user.id !== interaction.user.id) {
          return inter.reply({
            content:
              "Only the person who ran this command can switch chromas. Run `/skin` yourself!",
            flags: MessageFlags.Ephemeral,
          });
        }
        activeChroma = Number(inter.values[0]) || 0;
        return inter.update({
          embeds: [buildEmbed(activeChroma)],
          components: buildComponents(activeChroma),
        });
      }
    });

    collector.on("end", () => {
      msg.edit({ components: buildComponents(activeChroma, true) }).catch(() => null);
    });
  }
};

const Command = require("../../structures/Command");
const {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");

const {
  MAX_WISHLIST_PER_ACCOUNT,
  getUser,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
} = require("../../structures/database/Database");
const {
  searchSkins,
  getSkinIndex,
  loadWeaponSkins,
} = require("../../structures/valorant/util/Cache");
const { getOfferPrices } = require("../../structures/valorant/util/Shop");

const VP_EMOJI = "<:vp_png:974611751146496020>";
const VALORANT_EMOJI = "<:valorant_logo:965476928930852864>";

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Manage your Valorant weapon skin wishlist!",
      category: "Valorant",
      categoryEmoji: VALORANT_EMOJI,
      guildOnly: true,
      devMode: false,
      userPerms: [],
      botPerms: [],
      options: [
        {
          name: "add",
          description: "Add a weapon skin to your wishlist (notifies you via DM when in store)",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "skin",
              description: "The weapon skin to add to your wishlist",
              type: ApplicationCommandOptionType.String,
              required: true,
              autocomplete: true,
            },
          ],
        },
        {
          name: "remove",
          description: "Remove a weapon skin from your wishlist",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "skin",
              description: "The wishlisted skin to remove",
              type: ApplicationCommandOptionType.String,
              required: true,
              autocomplete: true,
            },
          ],
        },
        {
          name: "list",
          description: "View and manage your current skin wishlist",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    });
  }

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand(false);
    const focused = (interaction.options.getFocused() || "").trim().toLowerCase();

    if (sub === "remove") {
      const user = getUser(interaction.user.id);
      if (!user) return interaction.respond([]);
      const wishlist = getWishlist(interaction.user.id, user.puuid);
      const filtered = wishlist
        .filter((item) => !focused || item.name.toLowerCase().includes(focused))
        .slice(0, 25);

      return interaction.respond(
        filtered.map((item) => ({
          name: item.name.slice(0, 100),
          value: item.uuid,
        })),
      );
    }

    // Default (`add`): search store skins
    const results = searchSkins(focused, 25).filter((s) => !s.source || s.source === "store");
    return interaction.respond(
      results.map((skin) => ({
        name: skin.name.slice(0, 100),
        value: skin.uuid,
      })),
    );
  }

  async run(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = getUser(interaction.user.id);

    if (!user) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Wishlist Status: NOT LOGGED IN",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription("You are not logged in! Please run `/login` first."),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const footerData = {
      text: "VAL-13T • Store resets daily at 07:00 AM",
      iconURL: this.client.user.displayAvatarURL(),
    };

    if (sub === "add") {
      const input = interaction.options.getString("skin");
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      let index = getSkinIndex();
      if (!index.length || index[0].source === undefined) {
        await loadWeaponSkins();
        index = getSkinIndex();
      }

      const skin = index.find((s) => s.uuid === input) || searchSkins(input, 1)[0];
      if (!skin) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setAuthor({
                name: "Wishlist: SKIN NOT FOUND",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription(`Couldn't find any weapon skin matching **${input}**!`),
          ],
        });
      }

      if (skin.source && skin.source !== "store") {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setAuthor({
                name: "Wishlist: NOT A STORE SKIN",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setThumbnail(skin.icon)
              .setDescription(
                `**${skin.name}** is an exclusive **${skin.source.toUpperCase()}** item and cannot appear in the daily store rotation!`,
              ),
          ],
        });
      }

      const currentList = getWishlist(interaction.user.id, user.puuid);
      const alreadyExists = currentList.some((w) => w.uuid === skin.uuid);

      if (!alreadyExists && currentList.length >= MAX_WISHLIST_PER_ACCOUNT) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setAuthor({
                name: "Wishlist: LIMIT REACHED",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription(
                `You have reached the maximum of **${MAX_WISHLIST_PER_ACCOUNT} wishlisted skins** for **${user.username}**! Remove a skin first with \`/wishlist remove\`.`,
              ),
          ],
        });
      }

      addWishlistItem(interaction.user.id, user.puuid, skin.uuid, skin.name);

      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: alreadyExists ? "Wishlist: ALREADY ADDED" : "Wishlist: SKIN ADDED",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setThumbnail(skin.icon)
            .setDescription(
              [
                `${VALORANT_EMOJI} **${skin.name}** is now on the wishlist for **${user.username}** (\`${user.region.toUpperCase()}\`)!`,
                "",
                "I will automatically check your store every day at **07:00 AM** and send you a DM as soon as it appears.",
              ].join("\n"),
            )
            .setFooter(footerData),
        ],
      });
    }

    if (sub === "remove") {
      const input = interaction.options.getString("skin");
      const currentList = getWishlist(interaction.user.id, user.puuid);
      const target =
        currentList.find((w) => w.uuid === input) ||
        currentList.find((w) => w.name.toLowerCase() === input.trim().toLowerCase());

      if (!target) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setAuthor({
                name: "Wishlist: NOT FOUND",
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription("That skin is not in your current wishlist!"),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      removeWishlistItem(interaction.user.id, user.puuid, target.uuid);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
              name: "Wishlist: SKIN REMOVED",
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`Removed **${target.name}** from **${user.username}**'s wishlist!`)
            .setFooter(footerData),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // sub === "list"
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const index = getSkinIndex();
    const prices = await getOfferPrices();

    const buildListPayload = (disabled = false) => {
      const latestUser = getUser(interaction.user.id) || user;
      const list = getWishlist(interaction.user.id, latestUser.puuid);

      const skinLines = list.length
        ? list.map((item, idx) => {
            const skinMeta = index.find((s) => s.uuid === item.uuid);
            const vp = prices?.offers?.[item.uuid] ?? skinMeta?.price;
            const priceLabel = vp ? ` — ${VP_EMOJI} **${vp.toLocaleString("en-US")}** VP` : "";
            return `**${idx + 1}.** ${VALORANT_EMOJI} **${item.name}**${priceLabel}`;
          })
        : ["*Your wishlist is currently empty! Use `/wishlist add` to track your favorite skins.*"];

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setAuthor({
          name: `Skin Wishlist: ${latestUser.username} (${latestUser.region.toUpperCase()})`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setDescription(
          [
            `🎯 **Wishlisted Skins (${list.length}/${MAX_WISHLIST_PER_ACCOUNT}):**`,
            "",
            ...skinLines,
            "",
            "💡 *Tip: Want your full Daily Store sent to your DMs every day at 07:00 AM? Use `/notification daily-store`!*",
          ].join("\n"),
        )
        .setFooter(footerData);

      const rows = [];

      if (list.length > 0) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("wishlist-remove-select")
              .setPlaceholder(
                disabled
                  ? "This wishlist menu has expired!"
                  : "Select a skin to remove from your wishlist...",
              )
              .setDisabled(disabled)
              .addOptions(
                list.slice(0, 25).map((item) => ({
                  label: item.name.slice(0, 100),
                  value: item.uuid,
                  description: `Remove ${item.name} from wishlist`,
                  emoji: "🗑️",
                })),
              ),
          ),
        );
      }

      return { embeds: [embed], components: rows };
    };

    const msg = await interaction.followUp({
      ...buildListPayload(false),
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      time: 60000,
    });

    collector.on("collect", async (inter) => {
      if (inter.customId !== "wishlist-remove-select") return;
      collector.resetTimer({ time: 60000, idle: 60000 });

      const targetUuid = inter.values[0];
      const currentAcc = getUser(interaction.user.id) || user;
      removeWishlistItem(interaction.user.id, currentAcc.puuid, targetUuid);
      return inter.update(buildListPayload(false));
    });

    collector.on("end", () => {
      msg.edit(buildListPayload(true)).catch(() => null);
    });
  }
};

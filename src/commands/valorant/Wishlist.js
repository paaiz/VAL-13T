const Command = require("../../structures/Command");
const {
  ApplicationCommandOptionType,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
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
          name: "skin",
          description:
            "Optional: Add a weapon skin to your wishlist (leave empty to view wishlist)",
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true,
        },
      ],
    });
  }

  async autocomplete(interaction) {
    const focused = (interaction.options.getFocused() || "").trim().toLowerCase();
    const results = searchSkins(focused, 25).filter((s) => !s.source || s.source === "store");
    return interaction.respond(
      results.map((skin) => ({
        name: skin.name.slice(0, 100),
        value: skin.uuid,
      })),
    );
  }

  async run(interaction) {
    const input = interaction.options.getString("skin");
    const user = getUser(interaction.user.id);

    if (!user) {
      const notLoggedInContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "### Wishlist Status: NOT LOGGED IN",
              "You are not logged in! Please run `/login` first.",
            ].join("\n"),
          ),
        );

      return interaction.reply({
        components: [notLoggedInContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
    }

    const footerText = "-# VAL-13T • Store resets daily at 07:00 AM";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (input) {
      let index = getSkinIndex();
      if (!index.length || index[0].source === undefined) {
        await loadWeaponSkins();
        index = getSkinIndex();
      }

      const skin = index.find((s) => s.uuid === input) || searchSkins(input, 1)[0];
      if (!skin) {
        const notFoundContainer = new ContainerBuilder()
          .setAccentColor(0xff4655)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "### Wishlist: SKIN NOT FOUND",
                `Couldn't find any weapon skin matching **${input}**!`,
              ].join("\n"),
            ),
          );

        return interaction.followUp({
          components: [notFoundContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (skin.source && skin.source !== "store") {
        const notStoreContainer = new ContainerBuilder().setAccentColor(0xff4655);
        const notStoreText = new TextDisplayBuilder().setContent(
          [
            "### Wishlist: NOT A STORE SKIN",
            `**${skin.name}** is an exclusive **${skin.source.toUpperCase()}** item and cannot appear in the daily store rotation!`,
          ].join("\n"),
        );

        if (skin.icon) {
          notStoreContainer.addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(notStoreText)
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(skin.icon).setDescription(skin.name),
              ),
          );
        } else {
          notStoreContainer.addTextDisplayComponents(notStoreText);
        }

        return interaction.followUp({
          components: [notStoreContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const currentList = getWishlist(interaction.user.id, user.puuid);
      const alreadyExists = currentList.some((w) => w.uuid === skin.uuid);

      if (!alreadyExists && currentList.length >= MAX_WISHLIST_PER_ACCOUNT) {
        const limitContainer = new ContainerBuilder()
          .setAccentColor(0xff4655)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "### Wishlist: LIMIT REACHED",
                `You have reached the maximum of **${MAX_WISHLIST_PER_ACCOUNT} wishlisted skins** for **${user.username}**! Remove a skin first with \`/wishlist\`.`,
              ].join("\n"),
            ),
          );

        return interaction.followUp({
          components: [limitContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      addWishlistItem(interaction.user.id, user.puuid, skin.uuid, skin.name);

      const addedContainer = new ContainerBuilder().setAccentColor(0xff4655);
      const addedText = new TextDisplayBuilder().setContent(
        [
          `### ${alreadyExists ? "Wishlist: ALREADY ADDED" : "Wishlist: SKIN ADDED"}`,
          `**${skin.name}** is now on the wishlist for **${user.username}** (\`${user.region.toUpperCase()}\`)!`,
          "",
          "I will automatically check your store every day at **07:00 AM** and send you a DM as soon as it appears.",
        ].join("\n"),
      );

      if (skin.icon) {
        addedContainer.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(addedText)
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(skin.icon).setDescription(skin.name),
            ),
        );
      } else {
        addedContainer.addTextDisplayComponents(addedText);
      }

      addedContainer
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

      return interaction.followUp({
        components: [addedContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const index = getSkinIndex();
    const prices = await getOfferPrices();

    const buildListPayload = (disabled = false) => {
      const latestUser = getUser(interaction.user.id) || user;
      const list = getWishlist(interaction.user.id, latestUser.puuid);

      const container = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `### Skin Wishlist: ${latestUser.username} (${latestUser.region.toUpperCase()})`,
              `**Wishlisted Skins (${list.length}/${MAX_WISHLIST_PER_ACCOUNT}):**`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

      if (list.length > 0) {
        list.forEach((item, idx) => {
          const skinMeta = index.find((s) => s.uuid === item.uuid);
          const vp = prices?.offers?.[item.uuid] ?? skinMeta?.price;
          const priceLabel = vp ? ` — ${VP_EMOJI} **${vp.toLocaleString("en-US")}** VP` : "";

          container.addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `**${idx + 1}.** **${item.name}**${priceLabel}`,
                ),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setCustomId(`wishlist-remove:${item.uuid}`)
                  .setLabel("Remove")
                  .setStyle(ButtonStyle.Danger)
                  .setDisabled(disabled),
              ),
          );
        });
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "*Your wishlist is currently empty! Use `/wishlist` to track your favorite skins.*",
          ),
        );
      }

      return {
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      };
    };

    const msg = await interaction.followUp({
      ...buildListPayload(false),
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (inter) => {
      if (!inter.customId.startsWith("wishlist-remove:")) return;
      collector.resetTimer({ time: 60000, idle: 60000 });

      const targetUuid = inter.customId.split(":")[1];
      const currentAcc = getUser(interaction.user.id) || user;
      removeWishlistItem(interaction.user.id, currentAcc.puuid, targetUuid);
      return inter.update(buildListPayload(false));
    });

    collector.on("end", () => {
      msg.edit(buildListPayload(true)).catch(() => null);
    });
  }
};

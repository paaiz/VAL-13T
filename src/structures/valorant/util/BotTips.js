const { EmbedBuilder, MessageFlags } = require("discord.js");

const TIP_TRIGGER_CHANCE = 0.35;

const BOT_TIPS = [
  {
    type: "Tip",
    command: "wishlist",
    title: "💡 Tip: Never Miss Your Dream Skin!",
    description:
      "Hunting for a specific weapon skin? Add up to **10 skins** with **/wishlist** and **VAL-13T** will automatically DM you at **07:00 AM** the day it appears in your store!",
  },
  {
    type: "Tip",
    command: "notification",
    title: "💡 Tip: Automatic Daily Store DMs",
    description:
      "Tired of typing **/store** every day? Run **/notification** and enable **Daily Store Auto-DM** to get your fresh store image sent straight to your DMs every morning at **07:00 AM**!",
  },
  {
    type: "Tip",
    command: "accounts",
    title: "💡 Tip: Manage Multiple Riot Accounts",
    description:
      "Have alt accounts? You can link up to **5 Valorant accounts** using **/login** and switch your active account with a single click using **/accounts**!",
  },
  {
    type: "Tip",
    command: "skin",
    title: "💡 Tip: Inspect Any Weapon Skin",
    description:
      "Want to check a skin's VP price, chroma variants, or upgrade level videos? Use **/skin** to look up any weapon skin in Valorant anytime!",
  },
  {
    type: "Tip",
    command: "accessories",
    title: "💡 Tip: Check Your Kingdom Credits Shop",
    description:
      "Don't forget your weekly Accessory Store! Use **/accessories** to view the Player Cards, Gun Buddies, Sprays, and Titles currently in your rotation.",
  },
  {
    type: "Tip",
    command: "bundles",
    title: "💡 Tip: Featured Bundle & Balances",
    description:
      "You can check the current featured store bundle with **/bundles**, or view your VP, Radianite Points, and Kingdom Credits with **/balances**!",
  },
  {
    type: "Fun Fact",
    command: null,
    title: "🎲 Fun Fact: Daily Store Rotation",
    description:
      "Limited-edition bundles (like **Champions**, **Arcane**, or **VCT Capsules**) and Battle Pass skins never enter the daily **/store** rotation once their event ends!",
  },
  {
    type: "Fun Fact",
    command: null,
    title: "🔒 Fun Fact: Safe & Password-Free",
    description:
      "**VAL-13T** never asks for or stores your Riot password! Your session is authenticated directly through Riot Games' official sign-in page.",
  },
];

/**
 * Randomly sends a Tip or Fun Fact embed as a follow-up after a slash command executes.
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 * @param {string} executedCommandName
 */
async function maybeSendRandomTip(interaction, executedCommandName) {
  try {
    if (!interaction.replied && !interaction.deferred) return;
    if (Math.random() > TIP_TRIGGER_CHANCE) return;

    const pool = BOT_TIPS.filter((item) => item.command !== executedCommandName);
    if (!pool.length) return;

    const chosen = pool[Math.floor(Math.random() * pool.length)];

    const embed = new EmbedBuilder()
      .setColor(0xff4655)
      .setDescription([`-# ${chosen.title}\n`, `-# ${chosen.description}`].join("\n"));

    await interaction.followUp({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  } catch (_) {
    // Ignore followUp errors gracefully so command execution is never affected
  }
}

module.exports = {
  BOT_TIPS,
  TIP_TRIGGER_CHANCE,
  maybeSendRandomTip,
};

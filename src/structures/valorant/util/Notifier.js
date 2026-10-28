const { EmbedBuilder } = require("discord.js");
const { getDailyStore } = require("./Shop");
const { generateDailyStoreImage } = require("./StoreDesign");
const {
  getWishlist,
  getAllAutoCheckAccounts,
  getSystemSetting,
  setSystemSetting,
} = require("../../database/Database");

const VP_EMOJI = "<:vp_png:974611751146496020>";
const VALORANT_EMOJI = "<:valorant_logo:965476928930852864>";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getJakartaDateString = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

/**
 * Checks a specific Valorant account's daily store and sends a DM if:
 * - One or more wishlisted skins are in today's store, OR
 * - The account has Daily Store Auto-DM (`dailyDm`) enabled, OR
 * - `forceDm` is true (used by `/wishlist test`).
 */
const checkAccountStoreAndNotify = async (client, account, { forceDm = false } = {}) => {
  const wishlist = getWishlist(account.userId, account.puuid);
  if (!forceDm && !account.dailyDm && wishlist.length === 0) {
    return { sent: false, reason: "no_triggers" };
  }

  const dailyStore = await getDailyStore(account.userId, account.puuid);
  const storeSkins = [
    dailyStore["skin_1"],
    dailyStore["skin_2"],
    dailyStore["skin_3"],
    dailyStore["skin_4"],
  ].filter(Boolean);

  const wishlistUuidSet = new Set(wishlist.map((w) => w.uuid));
  const matchedSkins = [];

  for (const s of storeSkins) {
    if (wishlistUuidSet.has(s.uuid)) {
      const resolvedPrice = await Promise.resolve(s.price).catch(() => 0);
      matchedSkins.push({
        name: s.name,
        price: resolvedPrice,
      });
    }
  }

  const shouldSend = forceDm || account.dailyDm || matchedSkins.length > 0;
  if (!shouldSend) {
    return { sent: false, matchedCount: 0 };
  }

  const discordUser = await client.users.fetch(account.userId).catch(() => null);
  if (!discordUser) {
    return { sent: false, reason: "user_not_found" };
  }

  const image = await generateDailyStoreImage(dailyStore);

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setImage("attachment://store.png")
    .setFooter({
      text: "VAL-13T • Manage notifications anytime with /notification or /wishlist",
      iconURL: client.user.displayAvatarURL(),
    });

  if (matchedSkins.length > 0) {
    const matchLines = matchedSkins.map(
      (m) =>
        `> ${VALORANT_EMOJI} **${m.name}** — ${VP_EMOJI} **${
          m.price ? m.price.toLocaleString("en-US") : "?"
        }** VP`
    );

    embed
      .setAuthor({
        name: `Wishlist Alert for: ${account.username} (${account.region.toUpperCase()})`,
        iconURL: discordUser.displayAvatarURL(),
      })
      .setTitle(
        `🎉 ${matchedSkins.length} Wishlisted Skin${
          matchedSkins.length > 1 ? "s" : ""
        } in Your Store!`
      )
      .setDescription(
        [
          ...matchLines,
          "",
          `This store expires <t:${dailyStore.convertedStoreDuration}:R>`,
        ].join("\n")
      );
  } else {
    embed
      .setAuthor({
        name: `Daily Store for: ${account.username} (${account.region.toUpperCase()})`,
        iconURL: discordUser.displayAvatarURL(),
      })
      .setDescription(
        [
          `This store expires <t:${dailyStore.convertedStoreDuration}:R>`,
          wishlist.length > 0
            ? `*(None of your **${wishlist.length}** wishlisted skin${
                wishlist.length > 1 ? "s" : ""
              } appeared today)*`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      );
  }

  await discordUser.send({
    content: matchedSkins.length > 0 ? `<@${account.userId}>` : undefined,
    embeds: [embed],
    files: [image],
  });

  return {
    sent: true,
    matchedCount: matchedSkins.length,
    matchedSkins,
  };
};

/**
 * Runs daily after store reset to check all accounts with Wishlist or Daily Store Auto-DM enabled.
 * Includes per-account retries with polite delays to handle transient edge errors gracefully.
 * Tracks last_store_notified_date to avoid duplicate notifications on restarts.
 */
const runDailyStoreNotifications = async (client, { force = false } = {}) => {
  const todayStr = getJakartaDateString();
  const lastRun = getSystemSetting("last_store_notified_date");

  if (!force && lastRun === todayStr) {
    client.logger.ready(
      `[NOTIFIER] Daily store check for ${todayStr} already completed earlier today. Skipping.`
    );
    return { skipped: true, todayStr, sentCount: 0 };
  }

  const accounts = getAllAutoCheckAccounts();
  if (!accounts.length) {
    setSystemSetting("last_store_notified_date", todayStr);
    return { skipped: false, todayStr, sentCount: 0 };
  }

  client.logger.ready(
    `[NOTIFIER] Running daily store check for ${accounts.length} account(s) (${todayStr})...`
  );

  let sentCount = 0;
  for (const account of accounts) {
    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        const res = await checkAccountStoreAndNotify(client, account);
        if (res.sent) {
          sentCount++;
          const matchInfo =
            res.matchedCount > 0
              ? `${res.matchedCount} wishlist match(es)`
              : "Daily Store Auto-DM";
          client.logger.ready(
            `[NOTIFIER] Sent DM to ${account.username} (${account.userId}): ${matchInfo}`
          );
        } else {
          client.logger.ready(
            `[NOTIFIER] No DM needed for ${account.username} (${account.userId}): Wishlist skin not in today's store & Daily Store Auto-DM is disabled.`
          );
        }
        success = true;
      } catch (err) {
        if (attempts < maxAttempts) {
          client.logger.warn(
            `[NOTIFIER] Attempt ${attempts}/${maxAttempts} failed for ${account.username} (${account.userId}): ${err.message}. Retrying in 5s...`
          );
          await wait(5000);
        } else {
          client.logger.err(
            `[NOTIFIER] Failed store check for ${account.username} (${account.userId}) after ${maxAttempts} attempts: ${err.message}`
          );
        }
      }
    }
    await wait(3500);
  }

  setSystemSetting("last_store_notified_date", todayStr);
  client.logger.ready(
    `[NOTIFIER] Completed daily store check! Sent ${sentCount} DM notification(s) for ${todayStr}.`
  );

  return { skipped: false, todayStr, sentCount };
};

module.exports = {
  checkAccountStoreAndNotify,
  runDailyStoreNotifications,
};

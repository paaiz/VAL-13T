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
 * Checks if an error is non-retryable (fatal), meaning retrying immediately without user/external
 * intervention will inevitably produce the exact same error (e.g. DM closed, session expired, invalid user).
 */
const isNonRetryableError = (err) => {
  if (!err) return false;

  // Discord API errors: DMs disabled / user blocked bot (50007), Unknown User (10013), Forbidden (403)
  if (err.code === 50007 || err.code === 10013 || err.status === 403) {
    return true;
  }

  const msg = (err.message || "").toLowerCase();
  if (
    msg.includes("cannot send messages to this user") ||
    msg.includes("session has expired") ||
    msg.includes("not logged in") ||
    msg.includes("user not found") ||
    msg.includes("bad_claims")
  ) {
    return true;
  }

  return false;
};

/**
 * Formats a concise, descriptive failure status for logging and user notifications.
 */
const formatFailureStatus = (err) => {
  if (!err) return "Unknown error";
  if (
    err.code === 50007 ||
    err.message?.toLowerCase().includes("cannot send messages to this user")
  ) {
    return "DM Closed / Bot Blocked by user";
  }
  if (err.message?.toLowerCase().includes("session has expired")) {
    return "Session expired (/login required)";
  }
  if (err.message?.toLowerCase().includes("not logged in")) {
    return "Account not logged in";
  }
  return err.message;
};

/**
 * Checks if an error is related to Riot / Valorant Daily Store (e.g. session expired, store API error).
 */
const isValorantStoreError = (err) => {
  if (!err) return false;

  // Discord-specific errors (e.g. DM closed, unknown Discord user) are not Valorant store errors
  if (err.code === 50007 || err.code === 10013 || err.status === 403) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("cannot send messages") || msg.includes("missing permissions")) {
      return false;
    }
  }

  const msg = (err.message || "").toLowerCase();
  if (msg.includes("cannot send messages to this user") || msg.includes("user not found")) {
    return false;
  }

  return (
    err.name === "ValorantShopError" ||
    err.name === "ValorantAPIError" ||
    msg.includes("session has expired") ||
    msg.includes("not logged in") ||
    msg.includes("bad_claims") ||
    msg.includes("valorant") ||
    msg.includes("store") ||
    msg.includes("riot") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout")
  );
};

/**
 * Sends a DM notification embed to the user when a Valorant Daily Store error occurs,
 * explaining the error and what actions the user should take.
 */
const sendStoreErrorNotification = async (client, account, err) => {
  // Only send error notification if the account has Daily Store notification enabled
  if (!account?.userId || !account.dailyDm) return;

  try {
    const discordUser = await client.users.fetch(account.userId).catch(() => null);
    if (!discordUser) return;

    const errMsg = err?.message || "Unknown error";
    const lowerMsg = errMsg.toLowerCase();

    let whatUserShouldDo = "";

    if (
      lowerMsg.includes("session has expired") ||
      lowerMsg.includes("bad_claims") ||
      lowerMsg.includes("401") ||
      lowerMsg.includes("not logged in")
    ) {
      whatUserShouldDo =
        "Your Valorant login session has expired, so VAL-13T could not check today's store offers.\n\n" +
        "**What you need to do:**\n" +
        "> 1. Go to any Discord server where this bot is present.\n" +
        "> 2. Run the slash command `/login`.\n" +
        "> 3. Follow the instructions to re-authenticate your Valorant account.";
    } else if (
      lowerMsg.includes("503") ||
      lowerMsg.includes("unavailable") ||
      lowerMsg.includes("maintenance")
    ) {
      whatUserShouldDo =
        "Riot Games / Valorant store servers are currently experiencing issues or undergoing maintenance.\n\n" +
        "**What you need to do:**\n" +
        "> • No action is required on your end right now. Please wait until Riot finishes maintenance.\n" +
        "> • You can manually check your store later using `/store`.";
    } else {
      whatUserShouldDo =
        "An unexpected error occurred while communicating with Riot's store servers.\n\n" +
        "**What you need to do:**\n" +
        "> • Try checking your store manually later with `/store`.\n" +
        "> • If this issue persists tomorrow, try refreshing your session with `/login`.";
    }

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setAuthor({
        name: `Daily Store Automation for: ${account.username}`,
        iconURL: discordUser.displayAvatarURL(),
      })
      .setDescription(
        [
          `Failed to automatically check today's Daily Store for **${account.username}** (${(account.region || "AP").toUpperCase()}).`,
          "",
          `**Error:**`,
          `\`\`\`\n${errMsg}\n\`\`\``,
          whatUserShouldDo,
        ].join("\n"),
      )
      .setFooter({
        text: "VAL-13T • Manage notifications anytime with /notification or /wishlist",
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await discordUser.send({ embeds: [embed] }).catch(() => null);
  } catch (_) {
    // Silently ignore if DM delivery fails
  }
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

  const embed = new EmbedBuilder().setColor("Red").setImage("attachment://store.png").setFooter({
    text: "VAL-13T • Manage notifications anytime with /notification or /wishlist",
    iconURL: client.user.displayAvatarURL(),
  });

  if (matchedSkins.length > 0) {
    const matchLines = matchedSkins.map(
      (m) =>
        `> ${VALORANT_EMOJI} **${m.name}** — ${VP_EMOJI} **${
          m.price ? m.price.toLocaleString("en-US") : "?"
        }** VP`,
    );

    embed
      .setAuthor({
        name: `Wishlist Alert for: ${account.username} (${account.region.toUpperCase()})`,
        iconURL: discordUser.displayAvatarURL(),
      })
      .setTitle(
        `🎉 ${matchedSkins.length} Wishlisted Skin${
          matchedSkins.length > 1 ? "s" : ""
        } in Your Store!`,
      )
      .setDescription(
        [...matchLines, "", `This store expires <t:${dailyStore.convertedStoreDuration}:R>`].join(
          "\n",
        ),
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
          .join("\n"),
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
      `[NOTIFIER] Daily store check for ${todayStr} already completed earlier today. Skipping.`,
    );
    return { skipped: true, todayStr, sentCount: 0, results: [] };
  }

  const accounts = getAllAutoCheckAccounts();
  if (!accounts.length) {
    setSystemSetting("last_store_notified_date", todayStr);
    return { skipped: false, todayStr, sentCount: 0, results: [] };
  }

  client.logger.ready(
    `[NOTIFIER] Running daily store check for ${accounts.length} account(s) (${todayStr})...`,
  );

  let sentCount = 0;
  const results = [];

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
            res.matchedCount > 0 ? `${res.matchedCount} wishlist match(es)` : "Daily Store Auto-DM";
          client.logger.ready(
            `[NOTIFIER] Sent DM to ${account.username} (${account.userId}): ${matchInfo}`,
          );
          results.push({
            username: account.username,
            userId: account.userId,
            sent: true,
            status: matchInfo,
          });
        } else if (res.reason === "user_not_found") {
          client.logger.warn(
            `[NOTIFIER] Discord user not found for ${account.username} (${account.userId}). Skipping notification.`,
          );
          results.push({
            username: account.username,
            userId: account.userId,
            sent: false,
            status: "Discord user not found",
          });
        } else if (res.reason === "no_triggers") {
          results.push({
            username: account.username,
            userId: account.userId,
            sent: false,
            status: "No active triggers",
          });
        } else {
          client.logger.ready(
            `[NOTIFIER] No DM needed for ${account.username} (${account.userId}): Wishlist skin not in today's store & Daily Store Auto-DM is disabled.`,
          );
          results.push({
            username: account.username,
            userId: account.userId,
            sent: false,
            status: "Wishlist skin not in today's store & Daily DM disabled",
          });
        }
        success = true;
      } catch (err) {
        const isFatal = isNonRetryableError(err);
        const failureLabel = formatFailureStatus(err);

        if (!isFatal && attempts < maxAttempts) {
          client.logger.warn(
            `[NOTIFIER] Attempt ${attempts}/${maxAttempts} failed for ${account.username} (${account.userId}): ${err.message}. Retrying in 5s...`,
          );
          await wait(5000);
        } else {
          const logMsg = isFatal
            ? `[NOTIFIER] Non-retryable error for ${account.username} (${account.userId}): ${failureLabel}. Skipping retries.`
            : `[NOTIFIER] Failed store check for ${account.username} (${account.userId}) after ${maxAttempts} attempts: ${err.message}`;

          client.logger.err(logMsg);
          results.push({
            username: account.username,
            userId: account.userId,
            sent: false,
            status: isFatal ? `Failed: ${failureLabel}` : `Failed: ${err.message}`,
          });

          // Send an explanatory embed to the user only if Daily Store notification is enabled
          if (account.dailyDm && isValorantStoreError(err)) {
            await sendStoreErrorNotification(client, account, err);
          }

          break; // Stop retry loop immediately for non-retryable errors
        }
      }
    }
    await wait(3500);
  }

  setSystemSetting("last_store_notified_date", todayStr);
  client.logger.ready(
    `[NOTIFIER] Completed daily store check! Sent ${sentCount} DM notification(s) for ${todayStr}.`,
  );

  return { skipped: false, todayStr, sentCount, results };
};

module.exports = {
  checkAccountStoreAndNotify,
  runDailyStoreNotifications,
  sendStoreErrorNotification,
};

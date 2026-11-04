const Command = require("../../structures/Command");
const axios = require("axios").default;
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

const VALORANT_EMOJI = "<:valorant_logo:965476928930852864>";
const SEASONS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let seasonsCache = {
  data: null,
  fetchedAt: 0,
};

const fetchSeasonsData = async () => {
  const now = Date.now();
  if (seasonsCache.data && now - seasonsCache.fetchedAt < SEASONS_CACHE_TTL_MS) {
    return seasonsCache.data;
  }

  const res = await axios.get("https://valorant-api.com/v1/seasons");
  const list = res.data?.data || [];
  seasonsCache = {
    data: list,
    fetchedAt: now,
  };
  return list;
};

const buildProgressBar = (percent, length = 12) => {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * length);
  return "▰".repeat(filled) + "▱".repeat(Math.max(0, length - filled));
};

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      description: "Check the current Valorant Season / Act schedule and reset countdown!",
      category: "Valorant",
      categoryEmoji: VALORANT_EMOJI,
      guildOnly: true,
      devMode: false,
      userPerms: [],
      botPerms: [],
      options: [],
    });
  }

  async run(interaction) {
    await interaction.deferReply();

    const footerText = "-# VAL-13T was created by Paiz. Riot Games does not endorse this project.";

    try {
      const seasons = await fetchSeasonsData();
      const now = Date.now();

      const acts = seasons.filter((s) => s.type === "EAresSeasonType::Act");

      let currentAct = acts.find((s) => {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime).getTime();
        return now >= start && now <= end;
      });

      // Fallback if checked during maintenance window between Acts
      if (!currentAct && acts.length > 0) {
        currentAct = acts
          .filter((s) => new Date(s.startTime).getTime() <= now)
          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0];
      }

      if (!currentAct) {
        throw new Error("Could not find active Valorant season data right now.");
      }

      const parentSeason = currentAct.parentUuid
        ? seasons.find((s) => s.uuid === currentAct.parentUuid)
        : null;

      const fullSeasonName = parentSeason
        ? `${parentSeason.displayName} // ${currentAct.displayName}`
        : currentAct.displayName;

      const startMs = new Date(currentAct.startTime).getTime();
      const endMs = new Date(currentAct.endTime).getTime();
      const startUnix = Math.floor(startMs / 1000);
      const endUnix = Math.floor(endMs / 1000);

      const totalMs = Math.max(1, endMs - startMs);
      const elapsedMs = Math.max(0, Math.min(totalMs, now - startMs));
      const percent = Math.round((elapsedMs / totalMs) * 100);
      const daysLeft = Math.max(0, Math.ceil((endMs - now) / (1000 * 60 * 60 * 24)));
      const progressBar = buildProgressBar(percent, 12);

      const isEnded = now > endMs;

      const container = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `### Valorant Season: ${fullSeasonName}`,
              isEnded
                ? `⚠️ This Act ended <t:${endUnix}:R>. A new Act is starting soon!`
                : `⏳ Season resets <t:${endUnix}:R>`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "**Season Schedule**",
              `• **Act Start:** <t:${startUnix}:F>`,
              `• **Act Ends / Reset:** <t:${endUnix}:F> (<t:${endUnix}:R>)`,
              `• **Progress:** \`${progressBar}\` **${percent}%** (\`${daysLeft} day${
                daysLeft === 1 ? "" : "s"
              } remaining\`)`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

      return interaction.followUp({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      this.client.logger.err(`[VALORANT-SEASON] - ${err.message}`);

      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xff4655)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(["### Season Status: ERROR", err.message].join("\n")),
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

      return interaction.followUp({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  }
};

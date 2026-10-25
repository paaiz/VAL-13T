const axios = require("axios").default;
const fs = require("fs");
const path = require("path");

const Logger = require("../../Logger");
const log = new Logger();

const DATA_DIR = path.resolve(__dirname, "../../../../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const SKINS_CACHE_PATH = path.join(DATA_DIR, "skins.json");

let skinsCache = null;

const loadWeaponSkins = async () => {
  try {
    const response = await axios.get("https://valorant-api.com/v1/weapons/skins");

    const skins = {};
    for (const data of response.data.data) {
      const fallbackIcon =
        data.displayIcon ||
        data.chromas?.[0]?.displayIcon ||
        data.chromas?.[0]?.fullRender ||
        data.levels?.[0]?.displayIcon;

      const videoLevels = Array.isArray(data.levels)
        ? data.levels
            .filter((lvl) => Boolean(lvl.streamedVideo))
            .map((lvl, idx) => ({
              name: lvl.displayName
                ? lvl.displayName.replace(/\n/g, " ")
                : `${data.displayName} Level ${idx + 1}`,
              video: lvl.streamedVideo,
            }))
        : [];

      const bestVideo =
        videoLevels.length > 0
          ? videoLevels[videoLevels.length - 1].video
          : data.chromas?.find((c) => c.streamedVideo)?.streamedVideo || null;

      if (Array.isArray(data.levels)) {
        for (const level of data.levels) {
          skins[level.uuid] = {
            uuid: level.uuid,
            name: data.displayName,
            icon: level.displayIcon || fallbackIcon,
            tier: data.contentTierUuid,
            video: level.streamedVideo || bestVideo,
            videos: videoLevels,
          };
        }
      }
    }

    skinsCache = skins;
    fs.writeFileSync(SKINS_CACHE_PATH, JSON.stringify(skins, null, 2), "utf-8");
    log.ready(`Successfully Synced ${Object.keys(skins).length} Weapon Skin Levels!`);
    return skins;
  } catch (err) {
    log.err(`Failed to load weapon skins: ${err.message}`);
    return skinsCache;
  }
};

const getCachedSkins = () => {
  if (skinsCache) return skinsCache;
  if (fs.existsSync(SKINS_CACHE_PATH)) {
    try {
      skinsCache = JSON.parse(fs.readFileSync(SKINS_CACHE_PATH, "utf-8"));
      return skinsCache;
    } catch (_) {}
  }
  return {};
};

module.exports = { loadWeaponSkins, getCachedSkins, SKINS_CACHE_PATH };

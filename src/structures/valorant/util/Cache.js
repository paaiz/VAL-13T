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
const SKIN_INDEX_PATH = path.join(DATA_DIR, "skin_index.json");

let skinsCache = null;
let skinIndexCache = null;

const MELEE_WEAPON_UUID = "2f59173c-4bed-b6c3-2191-dea9b58be9c7";

// Standard VALORANT Store VP pricing by Content Tier UUID
const TIER_PRICES = {
  "12683d76-48d7-84a3-4e09-6985794f0445": { gun: 875, melee: 1750 }, // Select
  "0cebb8be-46d7-c12a-d306-e9907bfc5a25": { gun: 1275, melee: 2550 }, // Deluxe
  "60bca009-4182-7998-dee7-b8a2558dc369": { gun: 1775, melee: 3550 }, // Premium
  "e046854e-406c-37f4-6607-19a9ba8426fc": { gun: 2175, melee: 4350 }, // Exclusive
  "411e4a55-4e59-7757-41f0-86a53f101bb5": { gun: 2475, melee: 4950 }, // Ultra
};

/**
 * Builds a searchable entry for one weapon skin (used by `/skin`).
 * `uuid` is the level-1 UUID, which is also the store Offer ID.
 */
const buildSkinIndexEntry = (data, weapon, contractSources, videoLevels, fallbackIcon) => {
  const baseLevel = data.levels?.[0];
  if (!baseLevel || !data.contentTierUuid) return null; // skip Standard / Random Favorite skins

  const isMelee = weapon?.uuid === MELEE_WEAPON_UUID;

  let source =
    contractSources.get(baseLevel.uuid) ||
    contractSources.get(data.uuid) ||
    (Array.isArray(data.levels) &&
      data.levels.map((l) => contractSources.get(l.uuid)).find(Boolean)) ||
    "store";

  const tierPriceObj = TIER_PRICES[data.contentTierUuid];
  let price = null;
  if (source === "store" && tierPriceObj) {
    price = isMelee ? tierPriceObj.melee : tierPriceObj.gun;
  } else if (source === "battlepass") {
    price = 1000;
  }

  const chromas = Array.isArray(data.chromas)
    ? data.chromas.map((c, idx) => ({
        name: (c.displayName || `${data.displayName} Chroma ${idx + 1}`).replace(/\n/g, " "),
        image: c.fullRender || c.displayIcon || fallbackIcon,
        swatch: c.swatch || null,
        video: c.streamedVideo || null,
      }))
    : [];

  return {
    uuid: baseLevel.uuid,
    skinUuid: data.uuid,
    name: data.displayName,
    weaponName: weapon?.displayName || "Weapon",
    isMelee,
    tier: data.contentTierUuid,
    source,
    price,
    icon: fallbackIcon,
    levelCount: Array.isArray(data.levels) ? data.levels.length : 1,
    chromas,
    videos: videoLevels,
  };
};

const loadWeaponSkins = async () => {
  try {
    const [weaponsRes, contractsRes] = await Promise.all([
      axios.get("https://valorant-api.com/v1/weapons"),
      axios.get("https://valorant-api.com/v1/contracts").catch(() => null),
    ]);

    // Map reward UUID -> "battlepass" | "agent" | "event"
    const contractSources = new Map();
    for (const contract of contractsRes?.data?.data || []) {
      const relType = contract.content?.relationType;
      const sourceType =
        relType === "Season"
          ? "battlepass"
          : relType === "Agent"
            ? "agent"
            : relType === "Event"
              ? "event"
              : "contract";

      for (const chapter of contract.content?.chapters || []) {
        for (const lvl of chapter.levels || []) {
          if (lvl.reward?.uuid) contractSources.set(lvl.reward.uuid, sourceType);
        }
        for (const free of chapter.freeRewards || []) {
          if (free.uuid) contractSources.set(free.uuid, sourceType);
        }
      }
    }

    const skins = {};
    const skinIndex = [];
    for (const weapon of weaponsRes.data.data) {
      for (const data of weapon.skins || []) {
        const fallbackIcon =
          data.levels?.[0]?.displayIcon ||
          data.displayIcon ||
          data.chromas?.[0]?.displayIcon ||
          data.chromas?.[0]?.fullRender;

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

        const indexEntry = buildSkinIndexEntry(
          data,
          weapon,
          contractSources,
          videoLevels,
          fallbackIcon,
        );
        if (indexEntry) skinIndex.push(indexEntry);

        if (Array.isArray(data.levels)) {
          for (const level of data.levels) {
            skins[level.uuid] = {
              uuid: level.uuid,
              name: data.displayName,
              icon: level.displayIcon || fallbackIcon,
              tier: data.contentTierUuid,
              price: indexEntry?.price ?? null,
              source: indexEntry?.source ?? "store",
              video: level.streamedVideo || bestVideo,
              videos: videoLevels,
            };
          }
        }
      }
    }

    skinIndex.sort((a, b) => a.name.localeCompare(b.name));

    skinsCache = skins;
    skinIndexCache = skinIndex;
    fs.writeFileSync(SKINS_CACHE_PATH, JSON.stringify(skins, null, 2), "utf-8");
    fs.writeFileSync(SKIN_INDEX_PATH, JSON.stringify(skinIndex), "utf-8");
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

const getSkinIndex = () => {
  if (skinIndexCache) return skinIndexCache;
  if (fs.existsSync(SKIN_INDEX_PATH)) {
    try {
      skinIndexCache = JSON.parse(fs.readFileSync(SKIN_INDEX_PATH, "utf-8"));
      return skinIndexCache;
    } catch (_) {}
  }
  return [];
};

/**
 * Searches weapon skins by name. Exact > prefix > word-prefix > substring.
 */
const searchSkins = (query, limit = 25) => {
  const index = getSkinIndex();
  const q = (query || "").trim().toLowerCase();
  if (!q) return index.slice(0, limit);

  const scored = [];
  for (const skin of index) {
    const name = skin.name.toLowerCase();
    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
    else if (name.includes(q)) score = 3;
    if (score >= 0) scored.push({ skin, score });
  }

  scored.sort((a, b) => a.score - b.score || a.skin.name.localeCompare(b.skin.name));
  return scored.slice(0, limit).map((s) => s.skin);
};

module.exports = {
  loadWeaponSkins,
  getCachedSkins,
  getSkinIndex,
  searchSkins,
  SKINS_CACHE_PATH,
};

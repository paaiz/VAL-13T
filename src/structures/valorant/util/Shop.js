const axios = require("axios").default;
const fs = require("fs");
const path = require("path");

const skinTier = require("../../../assets/json/tier.json");
const { getUser, saveUser, reauthorizeUser } = require("../Valorant");
const { loadWeaponSkins, getCachedSkins } = require("./Cache");

const VP_UUID = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
const RP_UUID = "e59aa87c-4cbf-517a-5983-6e81511be9b7";
const KC_UUID = "85ca954a-41f2-ce94-9b45-8ca3dd39a00d";

const SKIN_TYPE_ID = "e7c63390-eda7-46e0-bb7a-a6abdacd2433";

const ITEM_TYPES = {
  "3f296c07-64c3-494c-923b-fe692a4fa1bd": "Player Card",
  "dd3bf334-87f3-40bd-b043-682a57a8dc3a": "Gun Buddy",
  "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475": "Spray",
  "de7caa6b-adf7-4588-bbd1-143831e786c6": "Player Title",
};

class ValorantShopError extends Error {
  data;

  constructor(message, data) {
    super(message);
    this.data = data;
  }
}

/**
 * Ensures the user has a valid, up-to-date X-Riot-ClientVersion header.
 */
const ensureClientHeaders = async (id, user) => {
  if (!user.headers["X-Riot-ClientVersion"]) {
    const versionRes = await axios.get("https://valorant-api.com/v1/version");
    user.headers["X-Riot-ClientVersion"] = versionRes.data.data.riotClientVersion;
    saveUser(id, user);
  }
  return {
    "X-Riot-ClientPlatform": user.headers["X-Riot-ClientPlatform"],
    "X-Riot-ClientVersion": user.headers["X-Riot-ClientVersion"],
    "X-Riot-Entitlements-JWT": user.headers["X-Riot-Entitlements-JWT"],
    Authorization: user.headers["Authorization"],
    "Content-Type": "application/json",
  };
};

/**
 * Helper to execute an authenticated Riot PD request with automatic re-auth retry if session expired.
 */
const requestWithReauth = async (id, requestFn) => {
  let user = getUser(id);
  if (!user) {
    throw new ValorantShopError(
      "You are not logged in! Please run `/login` first."
    );
  }

  try {
    const headers = await ensureClientHeaders(id, user);
    return await requestFn(user, headers);
  } catch (err) {
    const status = err.response?.status;
    const errorCode = err.response?.data?.errorCode;

    if (status === 503) {
      throw new ValorantShopError("Valorant services are currently unavailable. Please try again later!");
    }

    if (errorCode === "BAD_CLAIMS" || status === 400 || status === 401) {
      const refreshedUser = await reauthorizeUser(id);
      if (refreshedUser) {
        const newHeaders = await ensureClientHeaders(id, refreshedUser);
        return await requestFn(refreshedUser, newHeaders);
      }
      throw new ValorantShopError(
        "Your login session has expired. Please run `/login` again!"
      );
    }

    throw new ValorantShopError(
      `An error occurred while communicating with Valorant servers (${errorCode || status || err.message}).`,
      err.response?.data
    );
  }
};

/**
 * Retrieves the balances of a user with the given ID.
 */
const getBalances = async (id) => {
  const req = await requestWithReauth(id, (user, headers) =>
    axios.get(`https://pd.${user.region}.a.pvp.net/store/v1/wallet/${user.puuid}`, {
      headers,
    })
  );

  const user = getUser(id);
  return {
    vp: req.data.Balances[VP_UUID] ?? 0,
    rp: req.data.Balances[RP_UUID] ?? 0,
    kc: req.data.Balances[KC_UUID] ?? 0,
    username: user.username,
  };
};

/**
 * Retrieves the daily store for a user using Storefront v3 (POST).
 */
const getDailyStore = async (id) => {
  const response = await requestWithReauth(id, (user, headers) =>
    axios.post(
      `https://pd.${user.region}.a.pvp.net/store/v3/storefront/${user.puuid}`,
      {},
      { headers }
    )
  );

  const panel = response.data["SkinsPanelLayout"];
  const skinIds = panel["SingleItemOffers"];
  const storeOffers = panel["SingleItemStoreOffers"] || [];
  const storeDuration = panel["SingleItemOffersRemainingDurationInSeconds"];

  const convertedStoreDuration = Math.floor(Date.now() / 1000) + storeDuration;

  let skinsData = readSkinsFile();
  const missingSkin = skinIds.some(
    (uuid) => !skinsData[uuid] || skinsData[uuid].video === undefined
  );
  if (missingSkin) {
    const refreshed = await loadWeaponSkins();
    if (refreshed) skinsData = refreshed;
  }

  const skins = {};
  let number = 1;

  for (const skinUuid of skinIds) {
    const offerObj = storeOffers.find((o) => o.OfferID === skinUuid);
    const directPrice = offerObj?.Cost?.[VP_UUID];
    const skinInfo = skinsData[skinUuid] || {
      uuid: skinUuid,
      name: "Unknown Skin",
      icon: "https://media.valorant-api.com/weaponskins/4d786f93-4227-f3b9-71c3-76821d33737c/displayicon.png",
      tier: "12683d76-48d7-84a3-4e09-6985794f0445",
      video: null,
      videos: [],
    };

    skins[`skin_${number++}`] = {
      uuid: skinUuid,
      name: skinInfo.name,
      image: skinInfo.icon,
      tierImage: getTierIMG(skinInfo.tier),
      video: skinInfo.video || null,
      videos: skinInfo.videos || [],
      price: directPrice !== undefined ? Promise.resolve(directPrice) : getWeaponPrice(id, skinUuid),
    };
  }

  return { ...skins, convertedStoreDuration };
};

/**
 * Retrieves active Featured Bundles for a user using Storefront v3 (POST).
 */
const getFeaturedBundles = async (id) => {
  const response = await requestWithReauth(id, (user, headers) =>
    axios.post(
      `https://pd.${user.region}.a.pvp.net/store/v3/storefront/${user.puuid}`,
      {},
      { headers }
    )
  );

  const featured = response.data["FeaturedBundle"];
  const rawBundles = featured?.Bundles?.length
    ? featured.Bundles
    : featured?.Bundle
    ? [featured.Bundle]
    : [];

  if (!rawBundles.length) {
    throw new ValorantShopError("No active Featured Bundles were found right now!");
  }

  let skinsData = readSkinsFile();

  const bundles = [];
  for (const b of rawBundles) {
    const bundleUuid = b.DataAssetID;
    const expiresAt = Math.floor(Date.now() / 1000) + (b.DurationRemainingInSeconds || 0);
    const rawItems = Array.isArray(b.Items) ? b.Items : [];

    const basePrice =
      b.TotalBaseCost?.[VP_UUID] ??
      rawItems.reduce((sum, item) => sum + (item.BasePrice || 0), 0);

    const price =
      b.TotalDiscountedCost?.[VP_UUID] ??
      b.TotalBaseCost?.[VP_UUID] ??
      rawItems.reduce((sum, item) => sum + (item.DiscountedPrice ?? item.BasePrice ?? 0), 0);

    const missingSkin = rawItems.some(
      (entry) =>
        entry.Item?.ItemTypeID === SKIN_TYPE_ID &&
        (!skinsData[entry.Item?.ItemID] || skinsData[entry.Item?.ItemID].video === undefined)
    );
    if (missingSkin) {
      const refreshed = await loadWeaponSkins();
      if (refreshed) skinsData = refreshed;
    }

    const resolvedItems = await Promise.all(
      rawItems.map(async (entry) => {
        const itemTypeId = entry.Item?.ItemTypeID;
        const itemId = entry.Item?.ItemID;
        const itemBasePrice = entry.BasePrice ?? 0;
        const itemDiscountedPrice = entry.DiscountedPrice ?? itemBasePrice;

        if (itemTypeId === SKIN_TYPE_ID) {
          const skinInfo = skinsData[itemId];
          const skinIcon =
            skinInfo?.icon ||
            "https://media.valorant-api.com/weaponskins/4d786f93-4227-f3b9-71c3-76821d33737c/displayicon.png";
          return {
            isWeapon: true,
            type: "Weapon Skin",
            name: skinInfo?.name || "Weapon Skin",
            icon: skinIcon,
            previewUrl: skinIcon,
            bannerUrl: null,
            video: skinInfo?.video || null,
            videos: skinInfo?.videos || [],
            basePrice: itemBasePrice,
            discountedPrice: itemDiscountedPrice,
          };
        }

        const detail = await resolveAccessoryItem(itemTypeId, itemId);
        return {
          isWeapon: false,
          type: detail.type,
          name: detail.name,
          icon: detail.icon,
          previewUrl: detail.previewUrl,
          bannerUrl: detail.bannerUrl,
          basePrice: itemBasePrice,
          discountedPrice: itemDiscountedPrice,
        };
      })
    );

    let name = "Featured Bundle";
    let image = null;
    try {
      const apiRes = await axios.get(`https://valorant-api.com/v1/bundles/${bundleUuid}`);
      if (apiRes.data?.data) {
        name = apiRes.data.data.displayName || name;
        image = apiRes.data.data.displayIcon || apiRes.data.data.displayIcon2 || null;
      }
    } catch (_) {}

    bundles.push({
      uuid: bundleUuid,
      name,
      image,
      price,
      basePrice,
      expiresAt,
      items: resolvedItems,
    });
  }

  const user = getUser(id);
  return { username: user.username, bundles };
};

/**
 * Resolves accessory item details (name & icon) from valorant-api.com.
 */
const resolveAccessoryItem = async (itemTypeId, itemId) => {
  const typeName = ITEM_TYPES[itemTypeId] || "Accessory";
  try {
    if (typeName === "Player Card") {
      const res = await axios.get(`https://valorant-api.com/v1/playercards/${itemId}`);
      return {
        type: typeName,
        name: res.data.data.displayName,
        icon: res.data.data.displayIcon || res.data.data.smallArt,
        previewUrl: res.data.data.largeArt || res.data.data.displayIcon,
        bannerUrl: res.data.data.wideArt || null,
      };
    }
    if (typeName === "Gun Buddy") {
      const res = await axios.get(`https://valorant-api.com/v1/buddies/levels/${itemId}`);
      return {
        type: typeName,
        name: res.data.data.displayName,
        icon: res.data.data.displayIcon,
        previewUrl: res.data.data.displayIcon,
        bannerUrl: null,
      };
    }
    if (typeName === "Spray") {
      const res = await axios
        .get(`https://valorant-api.com/v1/sprays/${itemId}`)
        .catch(() => axios.get(`https://valorant-api.com/v1/sprays/levels/${itemId}`));
      const fullPreview =
        res.data.data.animationGif ||
        res.data.data.fullTransparentIcon ||
        res.data.data.animationPng ||
        res.data.data.displayIcon;
      return {
        type: typeName,
        name: res.data.data.displayName,
        icon: res.data.data.displayIcon || fullPreview,
        previewUrl: fullPreview,
        bannerUrl: null,
      };
    }
    if (typeName === "Player Title") {
      const res = await axios.get(`https://valorant-api.com/v1/playertitles/${itemId}`);
      return {
        type: typeName,
        name: res.data.data.titleText || res.data.data.displayName,
        icon: null,
        previewUrl: null,
        bannerUrl: null,
      };
    }
  } catch (_) {}

  return {
    type: typeName,
    name: `${typeName} (${itemId.slice(0, 8)})`,
    icon: null,
    previewUrl: null,
    bannerUrl: null,
  };
};

/**
 * Retrieves weekly Accessory Store offers (Kingdom Credits) using Storefront v3 (POST).
 */
const getAccessoryStore = async (id) => {
  const response = await requestWithReauth(id, (user, headers) =>
    axios.post(
      `https://pd.${user.region}.a.pvp.net/store/v3/storefront/${user.puuid}`,
      {},
      { headers }
    )
  );

  const accessoryData = response.data["AccessoryStore"];
  if (!accessoryData || !Array.isArray(accessoryData["AccessoryStoreOffers"])) {
    throw new ValorantShopError("Accessory Store is currently unavailable!");
  }

  const offers = accessoryData["AccessoryStoreOffers"];
  const duration = accessoryData["AccessoryStoreRemainingDurationInSeconds"] || 0;
  const expiresAt = Math.floor(Date.now() / 1000) + duration;

  const items = [];
  for (const entry of offers) {
    const offer = entry.Offer;
    const reward = offer?.Rewards?.[0];
    const costKC = offer?.Cost?.[KC_UUID] ?? 0;

    if (reward) {
      const detail = await resolveAccessoryItem(reward.ItemTypeID, reward.ItemID);
      items.push({
        ...detail,
        costKC,
      });
    }
  }

  const user = getUser(id);
  return {
    username: user.username,
    expiresAt,
    items,
  };
};

/**
 * Retrieves the night market data for a given user using Storefront v3 (POST).
 */
const getNightmarket = async (id) => {
  const response = await requestWithReauth(id, (user, headers) =>
    axios.post(
      `https://pd.${user.region}.a.pvp.net/store/v3/storefront/${user.puuid}`,
      {},
      { headers }
    )
  );

  if (typeof response.data["BonusStore"] === "undefined" || !response.data["BonusStore"]) {
    throw new ValorantShopError("There is currently no Night Market available!");
  }

  const skinOffers = response.data["BonusStore"]["BonusStoreOffers"];
  const nightmarketDuration = response.data["BonusStore"]["BonusStoreRemainingDurationInSeconds"];
  const convertedNightmarketDuration = Math.floor(Date.now() / 1000) + nightmarketDuration;

  let skinsData = readSkinsFile();
  const missingSkin = skinOffers.some((data) => !skinsData[data.Offer.OfferID]);
  if (missingSkin) {
    const refreshed = await loadWeaponSkins();
    if (refreshed) skinsData = refreshed;
  }

  const skins = {};
  let number = 1;

  for (const data of skinOffers) {
    const weaponsData = data["Offer"];
    const offerId = weaponsData["OfferID"];
    const skinInfo = skinsData[offerId] || {
      uuid: offerId,
      name: "Unknown Skin",
      icon: "https://media.valorant-api.com/weaponskins/4d786f93-4227-f3b9-71c3-76821d33737c/displayicon.png",
      tier: "12683d76-48d7-84a3-4e09-6985794f0445",
    };

    skins[`skin_${number++}`] = {
      uuid: offerId,
      name: skinInfo.name,
      image: skinInfo.icon,
      tier: getTierIMG(skinInfo.tier),
      normalPrice: weaponsData["Cost"][VP_UUID],
      discountPercent: data["DiscountPercent"],
      discountPrice: data["DiscountCosts"][VP_UUID].valueOf(),
    };
  }

  return { ...skins, convertedNightmarketDuration };
};

const getWeaponPrice = async (id, skinId) => {
  const priceList = await requestWithReauth(id, (user, headers) =>
    axios
      .get(`https://pd.${user.region}.a.pvp.net/store/v1/offers/`, { headers })
      .then((res) => res.data)
  );

  const getOfferPrice = priceList["Offers"].find((oId) => oId.OfferID === skinId);
  return getOfferPrice ? getOfferPrice.Cost[VP_UUID] : 0;
};

const readSkinsFile = () => {
  return getCachedSkins();
};

const getTierIMG = (tierId) => {
  const found = skinTier["data"].find((id) => id.uuid === tierId);
  return found ? found.displayIcon : skinTier["data"][0].displayIcon;
};

module.exports = {
  getDailyStore,
  getFeaturedBundles,
  getAccessoryStore,
  getNightmarket,
  getBalances,
  ValorantShopError,
};

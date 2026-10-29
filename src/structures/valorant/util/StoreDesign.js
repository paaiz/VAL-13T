const { loadImage, createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const { AttachmentBuilder } = require("discord.js");
const path = require("path");

const CANVAS_WIDTH = 1089;
const CANVAS_HEIGHT = 417;

GlobalFonts.registerFromPath(
  path.resolve(__dirname, "../../../assets/fonts/Latinotype-EstandarRd-Regular.otf"),
  "Latino Type Standard"
);

// In-memory caches to save CPU, network bandwidth, and disk I/O
let cachedBackground = null;
const tierCache = new Map();
const skinImageCache = new Map();
const MAX_SKIN_CACHE = 120; // Bound cache size to prevent memory leaks

const getBackground = async () => {
  if (!cachedBackground) {
    cachedBackground = await loadImage(
      path.resolve(__dirname, "../../../assets/images/store_background.png")
    );
  }
  return cachedBackground;
};

const getCachedTierImage = async (url) => {
  if (!url) return null;
  if (tierCache.has(url)) return tierCache.get(url);
  try {
    const img = await loadImage(url);
    tierCache.set(url, img);
    return img;
  } catch (_) {
    return null;
  }
};

const getCachedSkinImage = async (url) => {
  if (!url) return null;
  if (skinImageCache.has(url)) return skinImageCache.get(url);
  try {
    const img = await loadImage(url);
    if (skinImageCache.size >= MAX_SKIN_CACHE) {
      const oldestKey = skinImageCache.keys().next().value;
      skinImageCache.delete(oldestKey);
    }
    skinImageCache.set(url, img);
    return img;
  } catch (_) {
    return null;
  }
};

/**
 * Draws weapon information on the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
 * @param {number} x - The x-coordinate of the top-left corner of the weapon image.
 * @param {number} y - The y-coordinate of the top-left corner of the weapon image.
 * @param {Object} skin - The skin object containing the weapon image, tier image, and price.
 * @param {string} skin.image - The URL of the weapon image.
 * @param {string} skin.tierImage - The URL of the tier image.
 * @param {Promise<number>} skin.price - The promise that resolves to the price of the skin.
 * @return {Promise<void>} - A promise that resolves when the drawing is complete.
 */
const drawWeaponInfo = async (ctx, x, y, skin) => {
  if (!skin) return;

  const [weaponImg, tierImg, price] = await Promise.all([
    getCachedSkinImage(skin.image),
    getCachedTierImage(skin.tierImage),
    Promise.resolve(skin.price).catch(() => 0),
  ]);

  if (weaponImg) {
    ctx.drawImage(weaponImg, x, y, 392, 92);
  }
  if (tierImg) {
    ctx.drawImage(tierImg, x - 80 ? x - 10 : x - 45, y - 65 ? 215 : 10, 44, 44);
  }
  ctx.fillText(trimString(skin.name), x - 80 ? x - 20 : x - 50, y - 65 ? 400 : 190);
  ctx.fillText(String(price), x - 80 ? x + 366 : x + 336, y - 65 ? 254 : 48);
};

/**
 * Trims a string to a specified maximum length and appends ellipsis if necessary.
 *
 * @param {string} text - The string to be trimmed.
 * @param {number} [maxLength=24] - The maximum length of the trimmed string. Default is 24.
 * @return {string} The trimmed string, with ellipsis appended if necessary.
 */
const trimString = (text, maxLength = 24) => {
  if (text.length > maxLength) {
    text = text.slice(0, maxLength - 3) + "...";
  }

  return text;
};

const generateDailyStoreImage = async (skins) => {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.font = '40px "Latino Type Standard"';
  ctx.fillStyle = "#FFFFFF";

  // Background (re-use cached image from memory)
  const background = await getBackground();
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // Placement for skins - rendered concurrently in parallel for max speed
  await Promise.all([
    drawWeaponInfo(ctx, 80, 65, skins["skin_1"]),
    drawWeaponInfo(ctx, 80, 280, skins["skin_2"]),
    drawWeaponInfo(ctx, 590, 65, skins["skin_3"]),
    drawWeaponInfo(ctx, 590, 280, skins["skin_4"]),
  ]);

  const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "store.png",
  });

  return attachment;
};

module.exports = { generateDailyStoreImage };

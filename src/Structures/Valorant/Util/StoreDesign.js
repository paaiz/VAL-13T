const { loadImage, createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const { AttachmentBuilder } = require("discord.js");
const path = require("path");

const CANVAS_WIDTH = 1089;
const CANVAS_HEIGHT = 417;

GlobalFonts.registerFromPath(
  path.resolve(__dirname, "../Assets/Fonts/Latinotype-EstandarRd-Regular.otf"),
  "Latino Type Standard"
);

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
  const weaponImg = await loadImage(skin.image);
  const tierImg = await loadImage(skin.tierImage);
  const price = await skin.price;

  ctx.drawImage(weaponImg, x, y, 392, 92);
  ctx.drawImage(tierImg, x - 80 ? x - 10 : x - 45, y - 65 ? 215 : 10, 44, 44);
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

  // Background
  const background = await loadImage(
    path.resolve(__dirname, "../Assets/Images/store_background.png")
  );
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // Placement for skins
  await drawWeaponInfo(ctx, 80, 65, skins["skin_1"]);
  await drawWeaponInfo(ctx, 80, 280, skins["skin_2"]);
  await drawWeaponInfo(ctx, 590, 65, skins["skin_3"]);
  await drawWeaponInfo(ctx, 590, 280, skins["skin_4"]);

  const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "store.png",
  });

  return attachment;
};

module.exports = { generateDailyStoreImage };

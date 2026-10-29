const { GlobalFonts, createCanvas, loadImage } = require("@napi-rs/canvas");
const { AttachmentBuilder } = require("discord.js");
const path = require("path");

GlobalFonts.registerFromPath(
  path.resolve(__dirname, "../../../assets/fonts/Latinotype-EstandarRd-Regular.otf"),
  "Latino Type Standard"
);

// In-memory cache for Night Market background
let cachedNightmarketBackground = null;
const getNightmarketBackground = async () => {
  if (!cachedNightmarketBackground) {
    cachedNightmarketBackground = await loadImage(
      path.resolve(__dirname, "../../../assets/images/nightmarket_background.png")
    );
  }
  return cachedNightmarketBackground;
};

const genetareNightMarketImage = async (skins) => {
  const canvas = createCanvas(1627, 410);
  const ctx = canvas.getContext("2d");

  ctx.font = '40px "Latino Type Standard"';
  ctx.fillStyle = "#FFFFFF";

  const background = await getNightmarketBackground();
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // Load all weapon images and tier images in parallel
  const [
    skin1WeaponImg,
    skin2WeaponImg,
    skin3WeaponImg,
    skin4WeaponImg,
    skin5WeaponImg,
    skin6WeaponImg,
    skin1TierImg,
    skin2TierImg,
    skin3TierImg,
    skin4TierImg,
    skin5TierImg,
    skin6TierImg,
  ] = await Promise.all([
    loadImage(skins["skin_1"].image),
    loadImage(skins["skin_2"].image),
    loadImage(skins["skin_3"].image),
    loadImage(skins["skin_4"].image),
    loadImage(skins["skin_5"].image),
    loadImage(skins["skin_6"].image),
    loadImage(skins["skin_1"].tier),
    loadImage(skins["skin_2"].tier),
    loadImage(skins["skin_3"].tier),
    loadImage(skins["skin_4"].tier),
    loadImage(skins["skin_5"].tier),
    loadImage(skins["skin_6"].tier),
  ]);

  // * WEAPON SKIN NAME 1-6
  const skin1WeaponText = skins["skin_1"].name;
  const skin2WeaponText = skins["skin_2"].name;
  const skin3WeaponText = skins["skin_3"].name;
  const skin4WeaponText = skins["skin_4"].name;
  const skin5WeaponText = skins["skin_5"].name;
  const skin6WeaponText = skins["skin_6"].name;

  // * NORMAL PRICE SKIN 1-6
  const skin1NormalPriceText = String(skins["skin_1"].normalPrice);
  const skin2NormalPriceText = String(skins["skin_2"].normalPrice);
  const skin3NormalPriceText = String(skins["skin_3"].normalPrice);
  const skin4NormalPriceText = String(skins["skin_4"].normalPrice);
  const skin5NormalPriceText = String(skins["skin_5"].normalPrice);
  const skin6NormalPriceText = String(skins["skin_6"].normalPrice);

  // * DISCOUNT PERCENT SKIN 1-6
  const skin1DiscountPercent = skins["skin_1"].discountPercent + "%";
  const skin2DiscountPercent = skins["skin_2"].discountPercent + "%";
  const skin3DiscountPercent = skins["skin_3"].discountPercent + "%";
  const skin4DiscountPercent = skins["skin_4"].discountPercent + "%";
  const skin5DiscountPercent = skins["skin_5"].discountPercent + "%";
  const skin6DiscountPercent = skins["skin_6"].discountPercent + "%";

  // * DISCOUNT PRICE SKIN 1-6
  const skin1DiscountPrice = String(skins["skin_1"].discountPrice);
  const skin2DiscountPrice = String(skins["skin_2"].discountPrice);
  const skin3DiscountPrice = String(skins["skin_3"].discountPrice);
  const skin4DiscountPrice = String(skins["skin_4"].discountPrice);
  const skin5DiscountPrice = String(skins["skin_5"].discountPrice);
  const skin6DiscountPrice = String(skins["skin_6"].discountPrice);

  // * PLACEMENT FOR SKIN 1 (KIRI)
  ctx.drawImage(skin1WeaponImg, 80, 65, 392, 92);
  ctx.drawImage(skin1TierImg, 110, 5, 44, 44);
  ctx.fillText(trimString(skin1WeaponText), 30, 190);

  ctx.fillText(skin1DiscountPrice, 446, 48);
  ctx.fillText(skin1NormalPriceText, 290, 48);
  ctx.fillText(skin1DiscountPercent, 37, 40, 50);

  // * PLACEMENT FOR SKIN 2 (KIRI BAWAH)
  ctx.drawImage(skin2WeaponImg, 80, 280, 392, 92);
  ctx.drawImage(skin2TierImg, 110, 207, 44, 44);
  ctx.fillText(trimString(skin2WeaponText), 30, 395);

  ctx.fillText(skin2DiscountPrice, 446, 248);
  ctx.fillText(skin2NormalPriceText, 290, 248);

  ctx.fillText(skin2DiscountPercent, 37, 244, 55);

  // * PLACEMENT FOR SKIN 3 (TENGAH)
  ctx.drawImage(skin3WeaponImg, 590, 65, 392, 92);
  ctx.drawImage(skin3TierImg, 650, 5, 44, 44);
  ctx.fillText(trimString(skin3WeaponText), 570, 190);

  ctx.fillText(skin3DiscountPrice, 988, 48);
  ctx.fillText(skin3NormalPriceText, 820, 48);

  ctx.fillText(skin3DiscountPercent, 576, 40, 55);

  // * PLACEMENT FOR SKIN 4 (TENGAH BAWAH)
  ctx.drawImage(skin4WeaponImg, 590, 280, 392, 92);
  ctx.drawImage(skin4TierImg, 650, 207, 44, 44);
  ctx.fillText(trimString(skin4WeaponText), 570, 395);

  ctx.fillText(skin4DiscountPrice, 988, 248);
  ctx.fillText(skin4NormalPriceText, 820, 248);

  ctx.fillText(skin4DiscountPercent, 576, 243, 55);

  // * PLACEMENT FOR SKIN 5 (KANAN)
  ctx.drawImage(skin5WeaponImg, 1170, 65, 392, 92);
  ctx.drawImage(skin5TierImg, 1200, 5, 44, 44);

  ctx.fillText(trimString(skin5WeaponText), 1115, 190);

  ctx.fillText(skin5DiscountPrice, 1525, 48);
  ctx.fillText(skin5NormalPriceText, 1370, 48);

  ctx.fillText(skin5DiscountPercent, 1115, 40, 55);

  // * PLACEMENT FOR SKIN 6 (KANAN BAWAH)
  ctx.drawImage(skin6WeaponImg, 1170, 280, 392, 92);
  ctx.drawImage(skin6TierImg, 1200, 207, 44, 44);

  ctx.fillText(trimString(skin6WeaponText), 1115, 395);

  ctx.fillText(skin6DiscountPrice, 1525, 248);
  ctx.fillText(skin6NormalPriceText, 1370, 248);

  ctx.fillText(skin6DiscountPercent, 1115, 243, 55);

  const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "nightmarket.png",
  });

  return attachment;
};

const trimString = (text, maxLength = 24) => {
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
    text = text + "...";
  }

  return text;
};

module.exports = { genetareNightMarketImage };

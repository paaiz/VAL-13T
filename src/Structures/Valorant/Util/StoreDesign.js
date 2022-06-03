const { loadImage, createCanvas, registerFont } = require('canvas');
const { MessageAttachment } = require('discord.js');

const path = require('path');

const generateDailyStoreImage = async (skins) => {
	// * REGISTERING FONT
	registerFont(path.resolve(__dirname, '../Assets/Fonts/Latinotype-EstandarRd-Regular.otf'), { family: 'Latino Type Standard' });

	const canvas = createCanvas(1089, 417);
	const ctx = canvas.getContext('2d');

	ctx.font = '40px "Latino Type Standard"';
	ctx.fillStyle = '#FFFFFF';

	// * BACKGROUND
	const background = await loadImage(path.resolve(__dirname, '../Assets/Images/store_background.png'));
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	// * WEAPON IMAGE SKIN 1-4
	const skin1WeaponImg = await loadImage(skins['skin_1'].image);
	const skin2WeaponImg = await loadImage(skins['skin_2'].image);
	const skin3WeaponImg = await loadImage(skins['skin_3'].image);
	const skin4WeaponImg = await loadImage(skins['skin_4'].image);

	// * WEAPON TIER IMG SKIN 1-4
	const skin1TierImg = await loadImage(skins['skin_1'].tierImage);
	const skin2TierImg = await loadImage(skins['skin_2'].tierImage);
	const skin3TierImg = await loadImage(skins['skin_3'].tierImage);
	const skin4TierImg = await loadImage(skins['skin_4'].tierImage);

	// * WEAPON SKIN PRICE 1-4
	const skin1PriceText = await skins['skin_1'].price;
	const skin2PriceText = await skins['skin_2'].price;
	const skin3PriceText = await skins['skin_3'].price;
	const skin4PriceText = await skins['skin_4'].price;

	// * WEAPON SKIN NAME 1-4
	const skin1WeaponText = skins['skin_1'].name;
	const skin2WeaponText = skins['skin_2'].name;
	const skin3WeaponText = skins['skin_3'].name;
	const skin4WeaponText = skins['skin_4'].name;

	// * PLACEMENT FOR SKIN 1 (KIRI)
	ctx.drawImage(skin1WeaponImg, 80, 65, 392, 92);
	ctx.drawImage(skin1TierImg, 35, 10, 44, 44);
	ctx.fillText(trimString(skin1WeaponText), 30, 190);
	ctx.fillText(skin1PriceText, 416, 48);

	// * PLACEMENT FOR SKIN 2 (KIRI BAWAH)
	ctx.drawImage(skin2WeaponImg, 80, 280, 392, 92);
	ctx.drawImage(skin2TierImg, 35, 215, 44, 44);
	ctx.fillText(trimString(skin2WeaponText), 30, 400);
	ctx.fillText(skin2PriceText, 416, 254);

	// * PLACEMENT FOR SKIN 3 (KANAN)
	ctx.drawImage(skin3WeaponImg, 590, 65, 392, 92);
	ctx.drawImage(skin3TierImg, 580, 10, 44, 44);
	ctx.fillText(trimString(skin3WeaponText), 570, 190);
	ctx.fillText(skin3PriceText, 956, 48);

	// * PLACEMENT FOR SKIN 4 (KANAN BAWAH)
	ctx.drawImage(skin4WeaponImg, 590, 280, 392, 92);
	ctx.drawImage(skin4TierImg, 580, 215, 44, 44);
	ctx.fillText(trimString(skin4WeaponText), 570, 400);
	ctx.fillText(skin4PriceText, 956, 254);

	const attachment = new MessageAttachment(canvas.toBuffer(), 'store.png');

	return attachment;
};

const trimString = (text, maxLength = 24) => {
	if (text.length > maxLength) {
		text = text.slice(0, maxLength);
		text = text + '...';
	}

	return text;
};

module.exports = { generateDailyStoreImage };

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const skinTier = require('../Assets/Data/tier.json');
const { getUser } = require('../Valorant');

class ValorantShopError extends Error {
	data;

	constructor(message, data) {
		super(message);
		this.data = data;
	}
}

const getBalances = async (id) => {
	const user = getUser(id);
	if (!user) throw new ValorantShopError("Error while trying to fetch your balances, please `/login` if you haven't login.", user);

	const req = await axios
		.get(`https://pd.${user.region}.a.pvp.net/store/v1/wallet/${user.puuid}`, {
			headers: {
				Authorization: user.headers['Authorization'],
				'X-Riot-Entitlements-JWT': user.headers['X-Riot-Entitlements-JWT'],
			},
		})
		.catch((err) => {
			if (err.response.data.errorCode === 'BAD_CLAIMS') {
				throw new ValorantShopError('Login sessions are expired. Try `/login` again.');
			}
		});

	// VP = Valorant Point
	// RP = Radianite Point
	const convertedBalanceObj = {
		vp: req.data.Balances['85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741'],
		rp: req.data.Balances['e59aa87c-4cbf-517a-5983-6e81511be9b7'],
		username: user.username,
	};

	return convertedBalanceObj;
};

const getDailyStore = async (id) => {
	const user = getUser(id);
	if (!user) throw new ValorantShopError("Error while trying to fetch your daily store, please `/login` if you haven't login.", user);

	let response = await axios
		.get(`https://pd.${user.region}.a.pvp.net/store/v2/storefront/${user.puuid}`, {
			headers: {
				Authorization: user.headers['Authorization'],
				'X-Riot-Entitlements-JWT': user.headers['X-Riot-Entitlements-JWT'],
			},
		})
		.catch((err) => {
			if (err.response.data.errorCode === 'BAD_CLAIMS') {
				throw new ValorantShopError('Login sessions are expired. Try `/login` again.');
			}
		});

	let skins = {};
	let number = 1;

	let skinId = response.data['SkinsPanelLayout']['SingleItemOffers'];
	let storeDuration = response.data['SkinsPanelLayout']['SingleItemOffersRemainingDurationInSeconds'];

	const convertedStoreDuration = Math.floor(Date.now() / 1000) + storeDuration;

	skinId.map((data) => {
		skins[`skin_${number++}`] = {
			uuid: data,
			name: getSkinName(data),
			image: getSkinIcon(data),
			tierImage: getTierIMG(getSkinTier(data)),
			price: getWeaponPrice(id, data),
		};
	});

	return { ...skins, convertedStoreDuration };
};

const getNightmarket = async (id) => {
	const user = getUser(id);
	if (!user) throw new ValorantShopError("Error while trying to fetch your nightmarket. Try `/login` if you haven't login.");

	let response = await axios
		.get(`https://pd.${user.region}.a.pvp.net/store/v2/storefront/${user.puuid}`, {
			headers: {
				Authorization: user.headers['Authorization'],
				'X-Riot-Entitlements-JWT': user.headers['X-Riot-Entitlements-JWT'],
			},
		})
		.catch((err) => {
			if (err.response.data.errorCode === 'BAD_CLAIMS') {
				throw new ValorantShopError('Login sessions are expired. Try `/login` again.');
			}
		});

	if (typeof response.data['BonusStore'] === 'undefined') {
		throw new ValorantShopError('There are currently no nightmarket available!');
	}

	let skinId = response.data['BonusStore']['BonusStoreOffers'];
	const nightmarketDuration = response.data['BonusStore']['BonusStoreRemainingDurationInSeconds'];

	const convertedNightmarketDuration = Math.floor(Date.now() / 1000) + nightmarketDuration;

	let skins = {};
	let number = 1;

	skinId.map((data) => {
		let weaponsData = data['Offer'];
		skins[`skin_${number++}`] = {
			uuid: weaponsData['OfferID'],
			name: getSkinName(weaponsData['OfferID']),
			image: getSkinIcon(weaponsData['OfferID']),
			tier: getTierIMG(getSkinTier(weaponsData['OfferID'])),

			normalPrice: weaponsData['Cost']['85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741'],
			discountPercent: data['DiscountPercent'],
			discountPrice: data['DiscountCosts']['85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741'].valueOf(),
		};
	});

	return { ...skins, convertedNightmarketDuration };
};

const getWeaponPrice = async (id, skinId) => {
	const user = getUser(id);
	if (!user) throw new ValorantShopError("Error while trying to fetch your daily store, please `/login` if you haven't login.", user);

	const priceList = await axios
		.get(`https://pd.${user.region}.a.pvp.net/store/v1/offers/`, {
			headers: {
				Authorization: user.headers['Authorization'],
				'X-Riot-Entitlements-JWT': user.headers['X-Riot-Entitlements-JWT'],
			},
		})
		.then((res) => res.data)
		.catch((err) => {
			if (err) throw new ValorantShopError('Something went wrong. Please try again later!', err);
		});

	const getOfferPrice = priceList['Offers'].find((oId) => oId.OfferID === skinId);

	// ---------------------- * VP
	return getOfferPrice.Cost['85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741'];
};

const getSkinName = (uuid) => {
	const data = fs.readFileSync(path.resolve(__dirname, '../Assets/Data/skins.json'), 'utf-8');
	const obj = JSON.parse(data);

	return obj[uuid].name;
};

const getSkinIcon = (uuid) => {
	const data = fs.readFileSync(path.resolve(__dirname, '../Assets/Data/skins.json'), 'utf-8');
	const obj = JSON.parse(data);

	return obj[uuid].icon;
};

const getSkinTier = (tierId) => {
	const data = fs.readFileSync(path.resolve(__dirname, '../Assets/Data/skins.json'), 'utf-8');
	const obj = JSON.parse(data);

	return obj[tierId].tier;
};

const getTierIMG = (tierId) => {
	const getTier = skinTier['data'].find((id) => id.uuid === tierId).displayIcon;

	return getTier;
};

module.exports = { getDailyStore, getNightmarket, getDailyStore, getBalances };

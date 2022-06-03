const { default: axios } = require('axios');
const fs = require('fs');
const path = require('path');

const Logger = require('../../Logger');
const log = new Logger();

const loadWeaponSkins = async () => {
	const response = await axios.get('https://valorant-api.com/v1/weapons/skins');

	let skins = {};
	response.data.data.map((data) => {
		let weaponsData = data['levels'][0];
		skins[weaponsData['uuid']] = {
			uuid: weaponsData['uuid'],
			name: data['displayName'],
			icon: weaponsData['displayIcon'],
			tier: data['contentTierUuid'],
		};
	});

	fs.writeFileSync(path.resolve(__dirname, '../Assets/Data/skins.json'), JSON.stringify(skins, null, 4), 'utf-8');
	log.ready('Successfully Loaded Weapon Skins!');
};

module.exports = { loadWeaponSkins };

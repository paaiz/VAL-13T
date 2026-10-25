const axios = require("axios").default;
const fs = require("fs");
const path = require("path");

const Logger = require("../../Logger");
const log = new Logger();

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

      if (Array.isArray(data.levels)) {
        for (const level of data.levels) {
          skins[level.uuid] = {
            uuid: level.uuid,
            name: data.displayName,
            icon: level.displayIcon || fallbackIcon,
            tier: data.contentTierUuid,
          };
        }
      }
    }

    fs.writeFileSync(
      path.resolve(__dirname, "../Assets/Data/skins.json"),
      JSON.stringify(skins, null, 4),
      "utf-8"
    );
    log.ready("Successfully Loaded Weapon Skins!");
    return skins;
  } catch (err) {
    log.err(`Failed to load weapon skins: ${err.message}`);
    return null;
  }
};

module.exports = { loadWeaponSkins };

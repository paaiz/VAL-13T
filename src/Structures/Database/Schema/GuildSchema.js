const { Schema, model } = require('mongoose');

const guildSchema = new Schema({
	guildId: { type: String, unique: true },

	// ! Deprecated
	isDeploy: { type: Boolean, default: false },
	isAnnounce: { type: Boolean, default: false },
});

module.exports = model('guild-data', guildSchema);

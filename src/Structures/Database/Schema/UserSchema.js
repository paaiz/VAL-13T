const { Schema, model } = require('mongoose');

const userSchema = new Schema({
	userId: { type: String, unique: true },
	isBlacklist: { type: Boolean, default: false },
});

module.exports = model('user-data', userSchema);

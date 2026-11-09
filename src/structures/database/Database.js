const connection = require("./connection");
const accounts = require("./accounts");
const wishlist = require("./wishlist");
const settings = require("./settings");
const analytics = require("./analytics");

module.exports = {
  ...connection,
  ...accounts,
  ...wishlist,
  ...settings,
  ...analytics,
};

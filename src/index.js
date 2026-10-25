const MainClient = require("./structures/MainClient");
const config = require("./assets/json/config.json");

const client = new MainClient(config);
client.start();

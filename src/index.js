const MainClient = require('./Structures/MainClient');
const config = require('./Assets/JSON/config.json');

const client = new MainClient(config);
client.start();
client.database.init();

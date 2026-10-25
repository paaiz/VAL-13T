const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
} = require("discord.js");
const chalk = require("chalk");

const Util = require("./Util");
const Logger = require("./Logger");
const ConnectDB = require("./Database/Connection");

require("dotenv").config();

const normalizePerms = (perms = []) => {
  const map = {
    SEND_MESSAGES: PermissionsBitField.Flags.SendMessages,
    VIEW_CHANNEL: PermissionsBitField.Flags.ViewChannel,
    ADMINISTRATOR: PermissionsBitField.Flags.Administrator,
    MANAGE_GUILD: PermissionsBitField.Flags.ManageGuild,
    MANAGE_MESSAGES: PermissionsBitField.Flags.ManageMessages,
  };
  return perms.map((p) => map[p] || PermissionsBitField.Flags[p] || p);
};

module.exports = class MainClient extends Client {
  constructor(options = {}) {
    super({
      allowedMentions: { parse: ["users", "roles"] },
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [
        Partials.User,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
      ],
    });

    this.validate(options);

    // Commands & Events collection
    this.commands = new Collection();
    this.events = new Collection();
    this.prefixCommands = new Collection();
    this.prefixAliases = new Collection();

    // Function & System
    this.utils = new Util(this);
    this.logger = new Logger();
    this.database = new ConnectDB(this);

    // Config file
    this.config = require("../Assets/JSON/config.json");
  }

  validate(options) {
    if (typeof options.client !== "object") {
      throw new TypeError(chalk.red("Options type must be an object!"));
    }

    if (!process.env.BOT_TOKEN && !process.env.DEVELOPMENT_TOKEN) {
      throw new Error(chalk.red("Discord Bot token is required!"));
    }

    if (options.client.development) {
      this.token = process.env.DEVELOPMENT_TOKEN || process.env.BOT_TOKEN;
    } else {
      this.token = process.env.BOT_TOKEN || process.env.DEVELOPMENT_TOKEN;
    }

    if (!options.client.prefix) {
      throw new Error(chalk.red("Discord Bot prefix are required!"));
    }

    if (typeof options.client.prefix !== "string") {
      throw new TypeError(chalk.red("Prefix type must be a string!"));
    }

    if (!options.defaultPerms) {
      throw new Error("Default permissions are required for the client!");
    }
    this.defaultPerms = new PermissionsBitField(
      normalizePerms(options.defaultPerms)
    ).freeze();
  }

  async connectToDB() {
    if (process.env.MONGODB_URI) {
      await this.database.init();
    }
  }

  async start(token = this.token) {
    await this.utils.loadEvents();
    await this.utils.loadPrefixCommands();

    await super.login(token);
  }
};

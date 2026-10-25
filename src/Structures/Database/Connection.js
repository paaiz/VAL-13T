const { connect, connection } = require("mongoose");

module.exports = class DatabaseConnection {
  constructor(client) {
    this.client = client;
  }

  async init() {
    if (!process.env.MONGODB_URI) return;

    connect(process.env.MONGODB_URI).catch((err) => {
      this.client.logger.err(`Database connection failed: ${err.message}`);
    });

    connection.on("connected", () => {
      this.client.logger.ready(`Connected to MongoDB Database!`);
    });

    connection.on("disconnected", () => {
      this.client.logger.warn("Database connection lost!");
    });

    connection.on("error", (err) => {
      this.client.logger.err(`Database connection error:\n${err.message}`);
    });
  }
};

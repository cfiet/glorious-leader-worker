const logger = require("./logger").create("postgres");
const pgp = require("pg-promise")();

const CONNECTION = {
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DATABASE
};

module.exports = {
  create(config) {
    config = config || CONNECTION;
    return pgp(config);
  },

  setup(config) {
    logger.info("Setting up database");
    const db = this.create(config);
    var conn;

    return db.connect().then(setupConnection => {
      conn = setupConnection;
    }).then(() => {
      logger.info("Setting up slogans table");
      return conn.query(`
        DROP TABLE slogans;
        
        CREATE TABLE IF NOT EXISTS slogans (
          key CHAR(64) PRIMARY KEY NOT NULL,
          text TEXT NOT NULL
        );
      `);
    }).then(() => {
      logger.info("Releasing setup DB connection");
      conn.done();
      return db;
    });
  },

  close() {
    logger.info("Closing database");
    pgp.end();
  }
};
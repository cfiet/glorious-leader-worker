const logger = require("./lib/logger").create("index");
const crypto = require("crypto");
const input = require("./lib/input");
const chain = require("./lib/chain");
const database = require("./lib/postgres");
const EXIT = require("./lib/exit");
const _ = require("lodash");

if (!process.env.LOG_SUPPRESS_ENVIRONMENT || process.env.LOG_SUPPRESS_ENVIRONMENT.toLowerCase() === "false") {
  const envDump = Object.keys(process.env).map(k => 
    `${k}=${process.env[k]}`
  ).join("\n");
  logger.info(`Environment\n${envDump}`);
}

const db = database.create();

const INPUT_FILE = process.env.SLOGANS_SOURCE_FILE;

logger.info(`Using input file: ${INPUT_FILE}`);
const setupChain = input.read(INPUT_FILE).catch(err => {
  logger.error(`An error occured while reading input file: ${err.message}`);
  process.exit(EXIT.INPUT_FILE_ERROR);
}).then(data =>
  chain.create(data.toString())
).catch(err => {
  logger.error(`An error occured while creating Markov chain: ${err.message}`);
  process.exit(EXIT.CHAIN_CREATION_ERROR);
});

const setupDb = database.setup().then(db => {
  logger.info("Database setup successful");
  return db;
}).catch(err => {
  logger.error(`An error occured while setting up database: ${err.message}`);
  process.exit(EXIT.DATABASE_SETUP_ERROR);
});

Promise.all([setupChain, setupDb]).then(([chain, db]) => {
  const SLOGANS_LIMIT = parseInt(process.env.SLOGANS_LIMIT, 10);
  const SLOGANS_CYCLE_LIMIT = parseInt(process.env.SLOGANS_CYCLE_LIMIT, 10);
  const SLOGANS_CYCLE_SUMMARIZE = parseInt(process.env.SLOGANS_CYCLE_SUMMARIZE, 10);
  const SLOGANS_CONFLICTS_PERCENTAGE_LIMIT = parseInt(process.env.SLOGANS_CONFLICTS_PERCENTAGE_LIMIT, 10);
  const SLOGANS_STARTING_WORDS = process.env.SLOGANS_STARTING_WORDS.split(" ");

  let cycles = 0;
  let inserted = 0;
  let conflicts = 0;
  let generated = 0;

  function getConflictsPercentage() {
    return Math.round(conflicts / generated) * 100;
  }

  function summarize() {
    logger.info(`Run ${cycles} cycles with ${generated} slogans generated and ${getConflictsPercentage()}% conflicts`);
  }

  logger.info(`Setup completed, starting generation with the following parameters
    slogans limit: ${SLOGANS_LIMIT},
    cycle limit: ${SLOGANS_CYCLE_LIMIT},
    summarize cycles: ${SLOGANS_CYCLE_SUMMARIZE},
    conflict percentage limit: ${SLOGANS_CONFLICTS_PERCENTAGE_LIMIT},
    starting words: ${SLOGANS_STARTING_WORDS}
  `);

  function cycle() {
    if (cycles && !isNaN(SLOGANS_CYCLE_LIMIT) && cycles >= SLOGANS_CYCLE_LIMIT) {
      summarize();
      logger.info(`Reached cycle limit of ${SLOGANS_CYCLE_LIMIT}, exiting`);
      process.exit(EXIT.SUCCESS);
    }

    if (cycles && !isNaN(SLOGANS_CONFLICTS_PERCENTAGE_LIMIT) && getConflictsPercentage() >= SLOGANS_CONFLICTS_PERCENTAGE_LIMIT) {
      summarize();
      logger.info(`Reached conflicts limit of ${SLOGANS_CONFLICTS_PERCENTAGE_LIMIT}%, exiting`);
      process.exit(EXIT.SUCCESS);
    }

    if (cycles && !isNaN(SLOGANS_LIMIT) && generated >= SLOGANS_LIMIT) {
      summarize();
      logger.info(`Reached generations limit of ${SLOGANS_LIMIT}, exiting`);
      process.exit(EXIT.SUCCESS);
    }

    if (cycles && cycles % SLOGANS_CYCLE_SUMMARIZE === 0) {
      summarize();
    }

    let startWord = _.sample(SLOGANS_STARTING_WORDS);
    let slogan = chain.start(startWord).end().process();
    let hash = crypto.createHash('sha256');
    hash.update(slogan);
    let key = hash.digest("hex");

    generated += 1;
    cycles += 1;

    db.query({
      text: "INSERT INTO slogans (key, text) VALUES ($1, $2)",
      name : "insert-slogan"
    }, [key, slogan]).then(() => {
      inserted += 1;
      setImmediate(cycle);
    }).catch(err => {
      conflicts += 1;
      setImmediate(cycle);
    });
  }

  setImmediate(cycle);

}).catch(err => {
  logger.error(`An error occured while setting up generation cycles: ${err.message}`);
  process.exit(EXIT.INTERNAL_ERROR);
});

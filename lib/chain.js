const logger = require("./logger").create("chain");

const MarkovChain = require("markovchain");

module.exports = {
  create(data) {
    return new Promise((done, fail) => {
      logger.info("Creating Markov chain");
      if (typeof data !== "string") {
        return fail(new Error(`Invalid data type ${typeof data}`));
      }

      if (data.length === 0) {
        return fail(new Error("Data is emptly"));
      }

      const chain = new MarkovChain(data, (text) =>
        text.toLowerCase()
      );

      logger.info("Markov chain created");
      done(chain);
    });
  }
};
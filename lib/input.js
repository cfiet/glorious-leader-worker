const logger = require("./logger").create("input");
const fsp = require("fs-promise");

module.exports = {
  read(source) {
    logger.info(`Reading file: ${source}`);
    return new Promise((done, fail) => {
      if (!source) {
        fail(new Error("No source file defined"));
      }
      done();
    }).then(() => {
      return fsp.exists(source).then(exists => {
        if (!exists) {
          throw new Error(`Input file ${source} does not exist`);
        }
        logger.info(`File ${source} exists`);
      });
    }).then(() => {
      return fsp.readFile(source).then(data => {
        logger.info(`Read ${data.length} bytes from ${source}`);
        return data;
      });
    });
  }
}
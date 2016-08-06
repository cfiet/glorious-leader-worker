require("dotenv").config();

const winston = require("winston");
const timestamp = true;



module.exports = {
  create(moduleName) {
    function getModuleName () {
      if (moduleName) {
        return ` ${moduleName}`;
      }
      return "";
    }

    function formatter(options) {
      return `${new Date().toISOString()} ${options.level.toUpperCase()}${getModuleName()}: ${options.message}`
    }

    const transports = [];
    if (!process.env.LOG_SUPPRESS_CONSOLE) {
      winston.log("Suppressing console output");
      transports.push(new winston.transports.Console({
        timestamp, formatter
      }));
    }

    if (process.env.LOG_FILE) {
      winston.log("Setting up logging to", process.env.LOGFILE);
      transports.push(winston.transports.File({
        filename: process.env.LOGFILE, 
        timestamp, 
        formatter
      }));
    } else {
      winston.log("Skipping logging to file");
    }

    return new winston.Logger({ transports });
  }
};
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = {
  getPath: () => {
    return path.dirname(process.cwd());
  },
  getCurrentDirectoryBase: () => {
    return path.basename(process.cwd());
  },
  directoryExists: () => {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch(err) {
      console.log(chalk.red(`Error: ${err}`));
      return false;
    }
  }
};

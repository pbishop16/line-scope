const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const shell = require('shelljs');

module.exports = {
  loadFile: (dir, name) => {
    shell.cd(dir);
    return fs.readJson(`./${name}`)
      .then(dataObj => {
        return dataObj;
      })
      .catch(err => {
        shell.echo(
          chalk.red(`File un-readable: ${err}`)
        );
      });
  },
  getPath: () => {
    return path.dirname(process.cwd());
  },
  getScopePath: () => {
    const envPath = process.env._;

    return path.dirname(envPath.replace('bin', 'lib/node_modules/line-scope'));
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

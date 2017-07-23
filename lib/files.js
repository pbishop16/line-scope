const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const shell = require('shelljs');

const {
  cd,
  echo,
  exec,
  touch,
} = shell;

module.exports = {
  loadFile: (dir, name) => {
    echo('loadFile called');
    echo(`${dir} | ${name}`);
    cd(dir);

    return fs.readJson(`./${name}`)
      .then(dataObj => {
        echo('readJson called');
        cd('-');

        return dataObj;
      })
      .catch(err => {
        echo(
          chalk.red(`File un-readable: ${err}`)
        );
        cd('-');

        return err;
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
  getCurrentDirectory: () => {
    return path.dirname(process.cwd());
  },
  directoryExists: (filePath) => {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch(err) {
      echo(
        chalk.red(`Error: ${err}`)
      );
      return false;
    }
  },
  fileExistsOfCreate: (dir, file) => {
    cd(dir);
    return fs.ensureFile(file)
      .then(() => {
        cd('-');

        return true;
      })
      .catch((err) => {
        echo(
          chalk.red(`${file} not created ${err}`)
        );
        cd('-');

        return false;
      });
  },
  updateFile: (name, dir, data) => {
    return fs.writeJson(`.${dir}\\${name}`, data)
      .then(() =>{
        echo(
          chalk.green(`${name} Updated!!!`)
        );
      })
      .catch(err => {
        echo(
          chalk.red(`${name} update failed: ${err}`)
        );
      });
  },
  createSupportFile: (dir, name) => {
    cd(dir);
    touch(`${name}.json`);
    exec(`open ${name}.json`);
    cd('-');
  }
};

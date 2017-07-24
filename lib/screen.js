const shell = require('shelljs');
const chalk = require('chalk');

const {
  echo,
  exec,
} = shell;

module.exports = {
  newScreen(service) {

    exec(`screen -dmS ${service}`);
  },
  destroyScreen(name) {
    exec(`screen -X -S ${name} quit`);
  },
  destroyAllScreens() {
    exec('screen -X quit');
  },
  listScreens() {
    exec('screen -ls');
  },
  attachScreenSession(name) {
    exec(`screen -r ${name}`);
  },
  sendCommand(cmd, name) {
    const output = exec(`screen -S ${name} -X '${cmd}' echo -ne '\\015'`);

    echo(output.stdout);
  }
};

const CLI = require('clui'),
  shell = require('shelljs'),
  Spinner = CLI.Spinner;

const countdown = new Spinner('Exiting in 10 seconds...  ', ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']);
// const setInterval = global.setInterval;

module.exports = {
  runSpinner() {
    try {
      countdown.start();
      let number = 10;
      setInterval(() => {
        number--;
        countdown.message('Exiting in ' + number + ' seconds...  ');
        if (number === 0) {
          countdown.stop();
          process.exit(0);
        }
      }, 1000);
    } catch(e) {
      shell.echo(e);
    }
  }
};

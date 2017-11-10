"use script";const CLI = require('clui'),
  shell = require('shelljs'),
  Spinner = CLI.Spinner;

const countdown = new Spinner('Exiting in 10 seconds...  ', ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']);

module.exports = {
  runSpinner() {
    countdown.start();

    let number = 10;
    setInterval(function () {
      number--;
      countdown.message('Exiting in ' + number + ' seconds...  ');
      shell.echo(process.stdout);
      if (number === 0) {
        countdown.stop();
        process.exit(0);
      }
    }, 1000);
  }
};

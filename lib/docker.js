const shell = require('shelljs');
const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');
const Docker = require('dockerode');
const _ = require('lodash');

const {
  exec,
  echo,
} = shell;

module.exports = {
  createDockerDb(dbName) {
    const name = dbName || 'db-master';

    exec(`docker run --name ${name} -e POSTGRES_USER=pbishop -p 5432:5432 -d postgres`);
  },
  dbExists(name) {
    const result = exec('docker ps -f "status=exited"');

    return _.includes(result, name);
  },
  volumeExists(name) {
    const result = exec(`docker volume ls | grep ${name}`);

    return _.includes(result, name);
  },
  startContainer(containerName) {
    exec(`docker start ${containerName}`);
  },
  stopContainer(containerName) {
    exec(`docker stop ${containerName}`);
  },
  copyVolume(currentVolume, newVolume) {
    exec(`docker run --rm -i -t -v ${currentVolume}:/from  -v ${newVolume}:/to alpine ash -c "cd /to ; cp -a /from ."`);
  },
  mountVolume(volume) {
    exec(`docker run --name db-master -v ${volume}:/var/lib/postgresql/data -d postgres`);
  },
  systemUsage() {
    const usage = exec('docker system df -v');
    echo(
      chalk.green(usage)
    );
  },
  changeVolume(volume) {
    exec('docker db-master stop');
    this.mountVolume(volume);
  }
};

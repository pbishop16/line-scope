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
    const name = `db-${dbName}` || 'db-master';

    return exec(`docker run --name ${name} --restart unless-stopped -e POSTGRES_USER=pbishop -p 5432:5432 -d postgres`, { silent: true });
  },
  dbExists(name) {
    const result = exec(`docker ps -a | grep ${name}`, { silent: true });
    const match = result.stdout.match(/(db-)\S+/g);

    return _.includes(match, name);
  },
  volumeExists(name) {
    const result = exec(`docker volume ls | grep ${name}`);

    return _.includes(result, name);
  },
  currentDb() {
    const result = exec('docker ps | grep db', { silent: true });
    const name = result.stdout && result.stdout.match(/(db-)\S+/g)[0];

    return name;
  },
  startContainer(containerName) {
    exec(`docker start ${containerName}`);
  },
  stopContainer(containerName) {
    const result = exec(`docker stop ${containerName}`, { silent: false });

    return result;
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

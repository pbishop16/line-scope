#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const CLI = require('clui');
const figlet = require('figlet');
const inquirer = require('inquirer');
const Preferences = require('preferences');
const _ = require('lodash');
const git = require('simple-git')();
const shell = require('shelljs');
const program = require('commander');
const gitState = require('git-state');
const fs = require('fs-extra');
const path = require('path');
const Docker = require('dockerode');
// const touch = require('touch');

const files = require('./lib/files');
const docker = require('./lib/docker');

const Spinner = CLI.Spinner;

const {
  exec,
  cd,
  echo,
} = shell;

let scopePath = null;
const masterDbName = 'master-db';
const tools = [
  { name: 'npm', cmd: '', install: false },
  { name: 'node', cmd: '', install: false },
  { name: 'ruby', cmd: '', install: false },
  { name: 'brew', cmd: '', install: false },
  { name: 'git', cmd: '', install: false },
  { name: 'nvm', cmd: '', install: false },
  { name: 'rbenv', cmd: '', install: false },
  { name: 'powder', cmd: 'version', install: false },
  { name: 'docker', cmd: '', install: false },
  { name: 'docker-compose', cmd: '', install: false },
  { name: 'docker-machine', cmd: '', install: false },
];

/******************************
 * START of main program process
 ******************************/

runProgram();

function runProgram() {
  scopePath = '~/scope-files';
  const config = files.fileExistsOfCreate(scopePath, 'config.json');
  const processSpinner = new Spinner('Processing command');
  let project = null;
  let projectData = null;
  let servicesData = null;
  let data;

  // Startup
  config
    .then(() =>{
      return files.loadFile(scopePath,'config.json');
    })
    .then((configData) => {
      data = configData;

      return files.loadFile(scopePath, 'services.json');
    })
    .then((serData) => {
      servicesData = serData;

      if (!data.filedir) {
        echo(
          chalk.red('No config file directory provided')
        );
      } else {
        echo(
          chalk.green('Config file upto date!')
        );
      }

      program
        .version('0.1.0')
        .option('-S, --services', 'Display service apps')
        .option('-e, --environment', 'Display environment details')
        .option('-u, --update-services', 'Edit services file')
        .option('-U, --update-project <name>', 'Edit project file')
        .option('-p, --process-path', 'Get process path');

      program
        .command('branch <service>')
        .description('Change service branch')
        .option('-b, --branch [title]', 'Selected branch to change to.')
        .option('-r, --reset')
        .action((service, options) => {
          const branch = options.branch;

          changeBranch(servicesData, service, branch, options.reset);
        });

      program
        .command('tail <service>')
        .description('Tail the development log of a particular service')
        .action((service) => {
          tailService(servicesData , service);
        });

      program
        .command('project-file <name>')
        .action((name) => {
          files.createSupportFile(scopePath, name);
        });

      program
        .command('project <name>')
        .option('-s, --set <name>', 'Project branch set')
        .option('-u, --update', 'Runs bundle install, migrations, seeds')
        .option('-v, --volume <name>', 'Link project to a new database volume')
        .option('-r, --reset', 'Full reset of the project database volume')
        .description('Load a project to set the local environment.')
        .action((name, options) => {
          project = {
            name,
            options,
          };
        });

      //Start of Line-Scope script execution
      clear();
      displayTitle();
      displayPath();
      program.parse(process.argv);
      processSpinner.start();

      if (project) {
        const fullName = `${project.name}.json`;

        echo('project called ' + fullName);

        return files.loadFile(scopePath, fullName);
      }

      if (program.services) {
        processSpinner.stop();
        loadServices(servicesData);
      }

      if (program.environment) {
        processSpinner.stop();
        getLocalEnvironmentDetails();
      }

      if (program.processPath) {
        processSpinner.stop();
        processPath();
      }

      process.exit(1);
    }).then((data) => {
      projectData = data;

      loadProject(servicesData, projectData, project);
      processSpinner.stop();
      process.exit(1);
    })
    .catch(err => {
      echo(
        chalk.red(err)
      );
      scopePath = null;
      projectData = null;
    });
}

/******************************
 * END of main program process
 ******************************/



/******************************
 * Program supporting functions
 ******************************/

function initalSetup() {
  // install dependencies
  // brew
  // rbenv
  // docker
  // powder
  // ruby

  // 1. run getLocalEnvironmentDetails();
  // 2. run installDependencies();
}

function displayTitle() {
  echo(
    chalk.yellow(
      figlet.textSync('Line Scope', { horizontoalLayout: 'full' })
    )
  );
}

function displayPath() {
  echo(
    chalk.blue(`Current path: ${files.getPath()}`)
  );
}

function processPath() {
  echo(
    chalk.blueBright(`Scope path: ${files.getCurrentDirectory()}`)
  );
}

function installDependencies() {
  const installSet = _.filter(tools, (tool) => tool.install);


}

/*
 * Load details for this directory/repo
 *
 */
function loadServices(data) {
  const rootDir = data.root;

  data.services.forEach(({name,directory}) => {
    const dir = rootDir + directory;
    const fileStatus = getBranchStatus(dir);
    const {
      branch,
      ahead,
      dirty,
      untracked,
      stashes,
    } = gitState.checkSync(dir);

    echo(chalk.bold.green(`Service: ${name} [${branch}] ahead:${ahead} | dirty:${dirty} | untracked:${untracked} | stashes:${stashes}`));
    echo(`${chalk.blueBright(fileStatus || ' All Clean...\n')}\ ${chalk.green('Directory: ' + dir)}`);
    echo('');
  });
}

/*
 * Load project branches and db volume
 *
 */
function loadProject(servicesData, projectData, projectCmd) {
  const set = projectCmd.options.set || 'base';
  const projectDbName = `${projectCmd.name}-db`;

  servicesData.services.forEach((service) => {
    const selected = projectData[set].filter((project) => {
      return project.name === service.name;
    });
    const selectedProject = selected[0];
    const serviceData = {
      root: servicesData.root,
      directory: service.directory,
    };

    // Docker: stop container
    const currentActiveDB = '';
    docker.stopContainer(currentActiveDB);
    // Docker: check for existing project volume or create new volume from master volume
    // Docker: link volume to container
    // Docker: start container
    const newDb = `db-${projectDbName}`;
    docker.dbExists(newDb);
    docker.createDockerDb(newDb);
    changeBranch(serviceData, selectedProject.name, selectedProject.branch, false);

    // If new volume
    // Git: run git pull
    // : Run bundle install
    // : Run bundle exec rake db:migrate

    // (Option '-u, --update')
    // Git: run git pull
    // : Run bundle install
    // : Run bundle exec rake db:migrate
  });

  docker.copyVolume(masterDbName, projectDbName);
}

/*
 * Verify and display current environment resources
 * Versions: (npm, node, ruby, ember, react, git, nvm, brew)
 */
function getLocalEnvironmentDetails() {

  tools.forEach((tool) => {
    const version = getVersion(tool);

    echo(
      chalk.yellow(version)
    );
  });
}

function getVersion(tool) {
  const command = tool.cmd || '--version';
  const version = exec(`${tool.name} ${command}`, {silent: true});

  if (version.code !== 0) {
    tool.install = true;
    return `- ${tool.name.toUpperCase()} not available, error: (${version.stderr}), code: ${version.code}`;
  }
  return `- ${tool.name.toUpperCase()} Version: ${version.stdout}`;
}

/*
 * Get the service's current branch
 *
 */
function getBranch(dir) {
  let branch;
  cd(dir);
  branch = exec('git branch | grep \\*', {silent: true});
  cd('-');

  return branch.stdout;
}

/*
 * Get the service's current branch status
 *
 */
function getBranchStatus(dir) {
  const re = /Your[\s\S]+\.\s/g;
  let status;
  cd(dir);
  status = exec('git status', {silent: true});

  cd('-');

  return status.stdout.match(re);
}


/*
 * Git change branch
 *
 */
function changeBranch(fileData, service, setBranch, reset) {
  let cmdResult;
  let branch = setBranch || 'master';
  let selectedService, selected, dir;

  if (fileData.services) {
    selected = fileData.services.filter((serviceObj) => {
      return serviceObj.name === service;
    });
    selectedService = selected[0];
  } else {
    selectedService = fileData;
  }

  dir = fileData.root + selectedService.directory;

  cd(dir);
  /*** Convert to test code ***/
  echo('Directory: ' + dir);
  echo('Service: ' + service);
  echo('Branch: ' + branch);
  echo('');
  /***************************/

  if (reset) {
    const rMessage = exec('git reset --hard', {silent: true});

    echo(
      chalk.blue(rMessage.stdout)
    );
  }
  exec('git stash', {silent: true});
  cmdResult = exec(`git checkout ${branch}`, {silent: true});
  cd('-');

  echo (`${chalk.green('Service: ' + service)} - ${chalk.green(cmdResult.stdout)} - ${chalk.green(cmdResult.stderr)}`);
}

function tailService(data, service) {
  const tailCmd = 'tail -f log/development.log';
  const dir = data.root + service;

  cd(dir);
  exec(tailCmd);
}

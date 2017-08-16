#!/usr/bin/env node

require('@std/esm');
const chalk = require('chalk');
// import chalk from 'chalk';
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
  {
    name: 'npm',
    cmd: '',
    installed: false,
    install: 'nvm install 6.6.0'
  },
  {
    name: 'node',
    cmd: '',
    installed: false,
    install: ''
  },
  {
    name: 'ruby',
    cmd: '',
    installed: false,
    install: ''
  },
  {
    name: 'brew',
    cmd: '',
    installed: false
  },
  {
    name: 'git',
    cmd: '',
    installed: false
  },
  {
    name: 'nvm',
    cmd: '',
    installed: false,
    install: 'curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash'
  },
  {
    name: 'rbenv',
    cmd: '',
    installed: false
  },
  {
    name: 'powder',
    cmd: 'version',
    installed: false
  },
  {
    name: 'docker',
    cmd: '',
    installed: false
  },
  {
    name: 'docker-compose',
    cmd: '',
    installed: false
  },
  {
    name: 'docker-machine',
    cmd: '',
    installed: false
  },
];

/******************************
 * START of main program process
 ******************************/

runProgram();

async function runProgram() {
  const processSpinner = new Spinner('Processing command');
  scopePath = '~/scope-files';

  await files.fileExistsOfCreate(scopePath, 'config.json');

  let project = null;
  let projectData = null;
  let servicesData = null;
  let data;

  try {
    data = await files.loadFile(scopePath,'config.json');

    servicesData = await files.loadFile(scopePath, 'services.json');

    if (!data.filedir) {
      echo(
        chalk.red('No config file directory provided')
      );
    } else {
      echo(
        chalk.green('Config file up to date!')
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
      .option('-u, --update')
      .action((service, options) => {
        const branch = options.branch;

        changeBranch(servicesData, service, branch, options.reset);

        if (options.update) {
          updateService(servicesData);
        }
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
      .command('database <name>')
      .option('-n, --new')
      .option('-s, --start')
      .option('-c, --cancel')
      .option('-D, --destroy')
      .option('-E, --exists')
      .action((name, options) => {
        let currentDbName;
        let result;

        switch (true) {
        case !!options.new:
          echo('new database');
          result = docker.createDockerDb(name);
          echo(
            chalk.green(`Database ${result} created successfully!`)
          );
          break;
        case !!options.start:
          echo('start database');
          currentDbName = docker.currentDb();

          if (currentDbName === name) {
            echo(
              chalk.red(`${currentDbName} is already running`)
            );
            break;
          }

          docker.stopContainer(currentDbName);
          docker.startContainer(name);
          echo(
            chalk.green(`Switched from ${currentDbName} to ${name}`)
          );
          break;
        case !!options.cancel:
          echo('stop database');
          result = docker.stopContainer(name);
          echo(
            chalk.green(`Database ${result.stdout} stopped!`)
          );
          break;
        case !!options.destroy:
          echo('Delete database');

          break;
        case !!options.exists:
          result = docker.dbExists(name);
          if (result) {
            echo(
              chalk.green(`${name} exists`)
            );
          } else {
            echo(
              chalk.red(`${name} does not exists`)
            );
          }
          break;
        default:
          currentDbName = docker.currentDb();
          echo(
            chalk.green(`Current Database: ${currentDbName}`)
          );
        }
      });

    program
      .command('project <name>')
      .option('-s, --set', 'Project branch set')
      .option('-u, --update', 'Runs bundle install, migrations, seeds')
      .option('-v, --volume', 'Link project to a new database volume')
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

      projectData = await files.loadFile(scopePath, fullName);

      await loadProject(servicesData, projectData, project);

      processSpinner.stop();
      process.exit(1);
    } else {
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
    }

  } catch (err) {
    echo(
      chalk.red(err)
    );
    scopePath = null;
    projectData = null;
  }
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
      figlet.textSync('Line Scope', { horizontalLayout: 'full' })
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
async function loadProject(servicesData, projectData, projectCmd) {
  const set = projectCmd.options.set || 'base';
  const projectDbName = `db-${projectCmd.name}`;

  servicesData.services.forEach((service) => {
    const selected = projectData[set].filter((project) => {
      return project.name === service.name;
    });
    const selectedProject = selected[0];
    const serviceData = {
      root: servicesData.root,
      directory: service.directory,
    };

    changeBranch(serviceData, selectedProject.name, selectedProject.branch, false);

    // const dbExists = docker.dbExists(projectDbName);

    if (!dbExists) {
      updateService(serviceData);
    }
  });

  // Docker: stop container
  const currentActiveDB = '';
  await docker.stopContainer(currentActiveDB);
  // Docker: check for existing project volume or create new volume from master volume
  // Docker: link volume to container
  // Docker: start container
  const newDb = `db-${projectDbName}`;
  const dbExists = await docker.dbExists(newDb);
  if (!dbExists) {
    await docker.createDockerDb(newDb);
  }

  await docker.startContainer(newDb);

  // If new volume
  if (!dbExists) {
    // Git: run git pull
    exec('git pull');
    // : Run backend commands

    // : Run bundle exec rake db:migrate

    // (Option '-u, --update')
    // Git: run git pull
    // : Run bundle install
    // : Run bundle exec rake db:migrate
  }
}

async function updateService(service) {
  const silent = false;

  if (service.type === 'backend') {
    exec('bundle install', { silent });
    exec('bundle exec rake db:migrate', { silent });

    service.service_cmd.forEach((cmd) => {
      exec(cmd, { silent });
    });
  }
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
  let version;
  if (tool.name === 'nvm') {
    version = exec(`${tool.name} ${command}`, {silent: true});
  } else {
    version = exec(`${tool.name} ${command}`, {silent: true});
  }

  if (version.code !== 0) {
    tool.installed = true;
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

  // if (reset) {
  //   const rMessage = exec('git reset --hard', {silent: true});
  //
  //   echo(
  //     chalk.blue(rMessage.stdout)
  //   );
  // } else {
  //  const sMessage =  exec('git stash', {silent: true});
  //  echo(
  //    chalk.blue(sMessage.stdout);
  //  )
  // }
  // cmdResult = exec(`git checkout ${branch}`, {silent: true});
  // cd('-');
  //
  // echo (`${chalk.green('Service: ' + service)} - ${chalk.green(cmdResult.stdout)} - ${chalk.green(cmdResult.stderr)}`);
}

function createDatabase(name) {
  try {
    const newDb = `db-${name}`;
    const result = docker.createDockerDb(newDb);
    if (result.code === 0) {
      echo(
        chalk.green(`${newDb} successfully create and is running`)
      );
    } else {
      echo(
        chalk.red(`Database ${newDb} could not be created check for duplicates below`)
      );
      docker.dbExists(newDb);
    }
  } catch(e) {
    echo(e);
  }
}

function tailService(data, service) {
  const tailCmd = 'tail -f log/development.log';
  const dir = data.root + service;

  cd(dir);
  exec(tailCmd);
}

function run(cmd, options) {
  const processSpinner = new Spinner('Executing command...');
  let command = cmd;
  let output;
  processSpinner.start();

  try {
    if (typeof(cmd) !== 'string') {
      command = cmd.toString();
    }
    output = exec(command, { silent: options.silent });

    if (options.return) {
      processSpinner.stop();
      return output;
    }
  } catch(e) {
    echo(
      chalk.red(e)
    );
  } finally {
    processSpinner.stop();
  }
}

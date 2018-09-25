#!/usr/bin/env node

// require('@std/esm');
const chalk = require('chalk');
const clear = require('clear');
const CLI = require('clui');
const figlet = require('figlet');
// const inquirer = require('inquirer');
// const Preferences = require('preferences');
const _ = require('lodash');
// const git = require('simple-git')();
const shell = require('shelljs');
const program = require('commander');
const gitState = require('git-state');
// const fs = require('fs-extra');
// const path = require('path');
// const Docker = require('dockerode');
// const cliSpinners = require('cli-spinners');
// const _setInterval = require('setinterval-plus');
// const heartbeats = require('heartbeats');
const elegantStatus = require('elegant-status');
// const Q = require('q');

// const touch = require('touch');
// const heart = heartbeats.createHeart(1000);

const files = require('./lib/files');
const docker = require('./lib/docker');
// const countdownSpinner = require('./lib/spinner');

const Spinner = CLI.Spinner;

process.stdout.write = process.stdout.write.bind(process.stdout);

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
    installed: false,
    install: [
      '/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"'
    ]
  },
  {
    name: 'git',
    cmd: '',
    installed: false
  },
  // {
  //   name: 'nvm',
  //   cmd: '',
  //   installed: false,
  //   install: [
  //     'curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash'
  //   ]
  // },
  {
    name: 'rbenv',
    cmd: '',
    installed: false,
  },
  {
    name: 'powder',
    cmd: 'version',
    installed: false
  },
  {
    name: 'docker',
    cmd: '',
    installed: false,
    install: [
      'brew install docker docker-compose docker-machine xhyve docker-machine-driver-xhyve',
      'sudo chown root:wheel $(brew --prefix)/opt/docker-machine-driver-xhyve/bin/docker-machine-driver-xhyve',
      'sudo chmod u+s $(brew --prefix)/opt/docker-machine-driver-xhyve/bin/docker-machine-driver-xhyve'
    ]
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
// const processSpinner = new Spinner('Processing command');
// processSpinner.start();
runProgram();

async function runProgram() {
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
      .option('-p, --process-path', 'Get process path')
      .option('-r, --run-spinner', 'Test run spinner');

    program
      .command('branch <service>')
      .alias('b')
      .description('Change service branch')
      .option('-b, --branch [title]', 'Selected branch to change to.')
      .option('-r, --reset', 'Force a hard reset of the branch when checking out')
      .option('-u, --update', 'Update the service based on the current branch')
      .option('--special', 'Run service specific command')
      .action((service, options) => {
        const branch = options.branch;

        changeBranch(servicesData, service, branch, options.reset);

        if (options.update) {
          updateService(servicesData, service, options.special);
        }
      });

    program
      .command('tail <service>')
      .alias('t')
      .description('Tail the development log of a particular service')
      .action((service) => {
        tailService(servicesData , service);
      });

    program
      .command('project-file <name>')
      .alias('pf')
      .description('Creates a new project mapping file')
      .action((name) => {
        files.createSupportFile(scopePath, name);
      });

    program
      .command('database <name>')
      .alias('db')
      .description('Provides basic docker database management')
      .option('-n, --new', 'Create a new database')
      .option('-s, --start', 'Stops the current database and starts an existing one')
      .option('-c, --cancel', 'Stops the current active database')
      .option('-D, --destroy', 'Removes an existing database')
      .option('-E, --exists', 'Checks if a database exists')
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
          currentDbName = docker.currentDb();

          if (currentDbName === name) {
            echo(chalk.yellow(`${currentDbName} is already running`));
            break;
          }

          currentDbName && docker.stopContainer(currentDbName);
          docker.startContainer(name);

          if (currentDbName) {
            echo(chalk.green(`Switched from ${currentDbName} to ${name}`));
          } else {
            echo(chalk.green(`Started ${name}!!`));
          }

          break;
        case !!options.cancel:
          try {
            stopDatabase(name);
            break;
          } catch(e) {
            echo(chalk.red(e));
            break;
          }
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
      .alias('pr')
      .description('Load a project to set the local environment.')
      .option('-s, --set', 'Project branch set')
      .option('-u, --update', 'Runs bundle install, migrations, seeds')
      .option('-v, --volume', 'Link project to a new database volume')
      .option('-r, --reset', 'Full reset of the project database volume')
      .action((name, options) => {
        project = {
          name,
          options,
        };
      });

    program
      .command('service <service>')
      .alias('sr')
      .description('Manage service state and updates')
      .option('--update', 'Update service dependencies')
      .action((service, options) => {
        switch(true) {
        case !!options.update:
          updateService(servicesData, service);
          break;
        default:
          echo(chalk.red(`Enter and option to manage ${service} or enter --help for details`));
        }
      });

    //Start of Line-Scope script execution
    clear();
    displayTitle();
    displayPath();
    // processSpinner.start();
    program.parse(process.argv);

    if (project) {
      const fullName = `${project.name}.json`;

      echo('project called ' + fullName);

      projectData = await files.loadFile(scopePath, fullName);

      await loadProject(servicesData, projectData, project);

      // processSpinner.stop();
      // process.exit(1);
    } else {

      switch (true) {
      case program.runSpinner:
        echo('Run test spinner');
        stopDatabase('Complete');
        break;
      case program.services:
        loadServices(servicesData);
        break;
      case program.environment:
        getLocalEnvironmentDetails();
        break;
      case program.processPath:
        processPath();
        break;
      default:
        // echo(chalk.green('Isolated command executed!!!'));
      }

      // process.exit(1);
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
  const update = !!projectCmd.options.update;
  const newDb = `db-${projectDbName}`;
  const currentActiveDB = '';
  let dbExists = '';

  await docker.stopContainer(currentActiveDB);
  dbExists = await docker.dbExists(newDb);

  if (dbExists) {
    await docker.startContainer(newDb);
  } else {
    await docker.createDockerDb(newDb);
  }

  // for (let service in servicesData.services) {
  //   const selected = projectData[set].filter((project) => {
  //     return project.name === service.name;
  //   });
  //   const selectedProject = selected[0];
  //   const serviceData = {
  //     root: servicesData.root,
  //     directory: service.directory,
  //   };
  //
  //   changeBranch(serviceData, selectedProject.name, selectedProject.branch, false);
  //
  //   if (!dbExists || update) {
  //     updateService(serviceData, selectedProject.name, true);
  //   }
  // };

  const promises = servicesData.services.map(async (service) => {
    const selected = projectData[set].filter((project) => {
      return project.name === service.name;
    });
    const selectedProject = selected[0];
    const serviceData = {
      root: servicesData.root,
      directory: service.directory,
    };

    await changeBranch(serviceData, selectedProject.name, selectedProject.branch, false);

    if (!dbExists || update) {
      await updateService(serviceData, selectedProject.name, true);
    }
  });

  return await Promise.all(promises);
}

async function updateService(data, name, runSpecial) {
  const silent = true;
  const dir = data.root + name;
  const serviceObject = _.find(data.services, (service) => {
    return service.name === name;
  });
  const baseCommands = [
    'git pull',
    'bundle install',
    'bundle exec rake db:migrate',
  ];
  let commands;

  if (runSpecial && serviceObject.service_cmd) {
    commands = baseCommands;
  } else {
    commands = _.concat(baseCommands, serviceObject.service_cmd);
  }

  cd(dir);
  if (serviceObject.type === 'backend') {
    // for (let cmd of commands) {
    //   const done = elegantStatus(`${name} ${cmd}`);
    //
    //   await exec(cmd, { silent }, function(code) {
    //     if (code === 0) {
    //       done(true);
    //     } else {
    //       done(false);
    //     }
    //   });
    // }

    const promises = commands.map(async (cmd) => {
      const done = elegantStatus(`${name} ${cmd}`);

      await exec(cmd, { silent }, function(code) {
        if (code === 0) {
          done(true);
        } else {
          done(false);
        }
      });
    });

    return await Promise.all(promises);
  }
}

/*
 * Verify and display current environment resources
 * Versions: (npm, node, ruby, ember, react, git, nvm, brew)
 */
function getLocalEnvironmentDetails() {

  tools.forEach((tool) => {
    const version = getVersion(tool);

    echo(chalk.yellow(version));
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
  // echo('Directory: ' + dir);
  // echo('Service: ' + service);
  // echo('Branch: ' + branch);
  // echo('');
  /***************************/

  if (reset) {
    const rMessage = exec('git reset --hard', {silent: true});
    echo(chalk.yellow(rMessage.stdout));
  } else {
    const sMessage =  exec('git stash', {silent: true});
    echo(chalk.yellow(sMessage.stdout));
  }

  cmdResult = exec(`git checkout ${branch}`, { async: true, silent: true});
  cd('-');
  echo (`${chalk.green('Service: ' + service)} - ${chalk.green(cmdResult.stdout)} - ${chalk.green(cmdResult.stderr)}`);

  return cmdResult;
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

function stopDatabase(name) {
  try {
    /* Clui Example */
    const processSpinner = new Spinner('Processing command');

    processSpinner.start();
    processSpinner.message('Stopping Database...');
    setTimeout(function() {
      try {
        processSpinner.stop();
      } catch(e) {
        echo(`\n ${e} \n`);
      }
    }, 3000);

    /* Clui Example two */
    // countdownSpinner.runSpinner();

    /* cli-spinners example */
    // const spinner = cliSpinners['dots'];
    // const frames = spinner.frames;
    // let i = 0;
    //
    // setInterval(function() {
    //   logUpdate(`${frames[i = ++i % frames.length]} Unicorns`);
    // }, spinner.interval);

    /* cli-spinners example with heartbeats */
    // heart.createEvent(1, { countTo: 10 }, function() {
    //  process.stdout.write(`${frames[i = ++i % frames.length]} Unicorns`);
    //  logUpdate(`${frames[i = ++i % frames.length]} Unicorns`);
    // });

    /* Ora Example */
  //   const spinner = new Ora({
  //     text: 'Loading files',
  //   });
  //
  //   spinner.start();
  //
  //   setTimeout(() => {
  //     spinner.color = 'yellow',
  //     spinner.text = 'Loading dependencies';
  //
  //     setTimeout(() => {
  //       spinner.succeed('All files and dependencies loaded!!!');
  //     }, 3000);
  //   }, 3000);
  //
  // } catch(e) {
  //   echo(e);
} catch(e) {

}
  // docker.stopContainer(name);
  // processSpinner.stop();
  //
  // echo(chalk.green('Database stopped!'));
}

#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const CLI = require('clui');
const figlet = require('figlet');
const inquirer = require('inquirer');
const Preferences = require('preferences');
const _ = require('lodash');
const git = require('simple-git')();
// const fs = require('fs');
const shell = require('shelljs');
const program = require('commander');
// const vorpal = require('vorpal')();
const gitState = require('git-state');
const fs = require('fs-extra');
const path = require('path');
// const touch = require('touch');

const files = require('./lib/files');
const screen = require('./lib/screen');

const Spinner = CLI.Spinner;

const {
  exec,
  cat,
  cd,
  echo,
} = shell;

let scopePath = null;
// let projectData = null;

/******************************
 * START of main program process
 ******************************/

// program
//   .command('setup [env]')
//   .description('setup new services or project file')
//   .option('-n, --name [name]', 'Set file name')
//   .option('-d, --dir [dir]', 'Set directory')
//   .action(createSupportFile(env, options));

runProgram();

/******************************
 * END of main program process
 ******************************/



/******************************
 * Program supporting functions
 ******************************/

function runProgram() {
  scopePath = '~/scope-files';
  const config = files.fileExistsOfCreate(scopePath, 'config.json');
  const processSpinner = new Spinner('Processing command');
  let projectName = null;
  let projectData = null;
  let servicesData = null;
  let data;

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
        .option('-u, --update-services ', 'Edit services file')
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
        .command('project-file <name>')
        .action((name) => {
          files.createSupportFile(scopePath, name);
        });

      program
        .command('project <name>')
        .description('Load a project to set the local environment.')
        .action((name) => {
          projectName = name;
        });

      clear();
      displayTitle();
      program.parse(process.argv);
      processSpinner.start();

      if (projectName) {
        const fullName = `${projectName}.json`;

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
      // echo(projectData);
      projectData = data;

      loadProject(servicesData, projectData);
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

/*
 * Load package for this directory/repo
 *
 */
function loadServices(data) {
  // const file = JSON.parse(cat('services.json'));
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

function loadProject(servicesData, projectData) {
  servicesData.services.forEach((service) => {
    const selected = projectData['base'].filter((project) => {
      return project.name === service.name;
    });
    const selectedProject = selected[0];
    const serviceData = {
      root: servicesData.root,
      directory: service.directory,
    };

    changeBranch(serviceData, selectedProject.name, selectedProject.branch, false);
  });
}

/*
 * Verify and display current environment resources
 * Versions: (npm, node, ruby, ember, react, git, nvm, brew)
 */
function getLocalEnvironmentDetails() {
  const tools = [
    { name: 'npm', cmd: '' },
    { name: 'node', cmd: '' },
    { name: 'ruby', cmd: '' },
    { name: 'brew', cmd: '' },
    { name: 'git', cmd: '' },
    { name: 'nvm', cmd: '' },
    { name: 'rbenv', cmd: '' },
    { name: 'powder', cmd: 'version' },
  ];

  tools.forEach((tool) => {
    const version = getVersion(tool);

    echo(
      chalk.yellow(version)
    );
  });
}

function getVersion({ name, cmd }) {
  const command = cmd || '--version';
  const version = exec(`${name} ${command}`, {silent: true});

  if (version.code !== 0) {
    return `- ${name.toUpperCase()} not available, error: (${version.stderr}), code: ${version.code}`;
  }
  return `- ${name.toUpperCase()} Version: ${version.stdout}`;
}

/*
 * Prompt user to see a selectable list of common commands
 *
 */



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
  let status;
  cd(dir);
  status = exec('git status --porcelain=v1', {silent: true});
  cd('-');

  return status.stdout;
}


/*
 * Git change branch
 *
 */
function changeBranch(fileData, service, setBranch, reset) {
  let branchOut;
  let branch = setBranch || 'master';
  let selectedService, selected, dir;
  // echo('Type: ' + typeof(fileData));

  if (typeof(fileData) === 'object') {
    selectedService = fileData;
  } else {
    selected = fileData.services.filter((serviceObj) => {
      return serviceObj.name === service;
    });
    selectedService = selected[0];
  }

  dir = fileData.root + selectedService.directory;

  // cd(dir);
  // echo('Directory: ' + dir);
  // echo('Service: ' + service);
  // echo('Branch: ' + branch);
  // echo('');

  git
    .cwd(dir)
    .stash()
    .reset('soft', (err) => {
      echo(
        chalk.red('Reset: ' + err)
      );
    })
    .checkoutBranch(branch)
    .then((result) => {
      echo('Result: ' + result);
    })
    .catch((err) => {
      echo(
        chalk.red('Failed: ', err)
      );
    });

  // if (reset) {
  //   const rMessage = exec('git reset --hard', {silent: true});
  //   echo(
  //     chalk.blue(rMessage.stdout)
  //   );
  // }
  // exec('git stash', {silent: true});
  // branchOut = exec(`git checkout ${branch}`, {silent: true});
  // cd('-');
  //
  // echo (`${chalk.green('Service: ' + service)} - ${chalk.green(branchOut.stdout)} - ${chalk.green(branchOut.stderr)}`);
}

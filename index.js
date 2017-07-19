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
const gitState = require('git-state');
const fs = require('fs-extra');
// const touch = require('touch');

const files = require('./lib/files');
const screen = require('./lib/screen');

const Spinner = CLI.Spinner;

const {
  exec,
  cat,
  cd,
  echo,
  touch,
} = shell;

/******************************
 * START of main program process
 ******************************/
program
  .version('0.1.0')
  .option('-S, --services', 'Display service apps')
  .option('-e, --environment', 'Display environment details')
  .option('-u, --update-services ', 'Edit services file')
  .option('-U, --update-project <name>', 'Edit project file')
  .option('-p, --process-path', 'Get process path');

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
  const scopePath = '/Users/pbishop/scope-files';
  files.loadFile(scopePath,'config.json')
    .then((data) =>{
      if (!data.filedir) {
        echo(
          chalk.red('No config file directory provided')
        );
      } else {
        echo(
          chalk.green('Config file upto date!')
        );
      }

      program.parse(process.argv);

      if (program.services) {
        clear();
        displayTitle();
        loadServices();
      }

      if (program.environment) {
        clear();
        displayTitle();
        getLocalEnvironmentDetails();
      }

      if (program.processPath) {
        clear();
        displayTitle();
        processPath();
      }
      cd();
      process.exit(1);
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
    chalk.blueBright(`Scope path: ${files.getScopePath()}`)
  );
}

/*
 * Get folder path for location where the tool is initiated
 *
 */


/*
 * Load package for this directory/repo
 *
 */
function loadServices() {
  const file = JSON.parse(cat('services.json'));
  const rootDir = file.root;

  file.services.forEach(({name,directory}) => {
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
  cd();

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
  cd();

  return status.stdout;
}


/*
 * Git change branch
 *
 */

function changeBranch(cmd) {

}


/*
 * Creat service or project file
 *
 */
function createSupportFile(type, options) {
  cd(options.dir);
  touch(`${options.name}.json`);
  exec(`open ${options.name}.json`);
}

function updateFile(name, dir, data) {
  fs.writeJson(`.${dir}\\${name}`, data)
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
}

#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const CLI = require('clui');
const figlet = require('figlet');
const inquirer = require('inquirer');
const Preferences = require('preferences');
const _ = require('lodash');
const git = require('simple-git')();
const touch = require('touch');
const fs = require('fs');
const shell = require('shelljs');
const program = require('commander');

const files = require('./lib/files');

const Spinner = CLI.Spinner;

clear();
console.log(
  chalk.yellow(
    figlet.textSync('Line Scope', { horizontoalLayout: 'full' })
  )
);
console.log(
  chalk.blue(files.getPath())
);

/*
 * Get folder path for location where the tool is initiated
 *
 */


/*
* Load package for this directory/repo
*
*/


/*
 * Verify and display current environment resources
 * Versions: (npm, node, ruby, ember, react, git, nvm, brew)
 */


/*
* Prompt user to see a selectable list of common commands
*
*/

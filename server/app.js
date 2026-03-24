const { default: chalk } = require("chalk");
const express = require("express");
const path = require('path');
const PORT = 3000;
const { error } = require("console");
const { sequelize } = require('./utils/database');


const app = express();



app.listen(PORT, async function () {
    console.log(chalk.blue('Server is running!'));
    try {
        await sequelize.authenticate();
        // await sessionStore.sync();
        console.log(chalk.green('connection has been established successfully'));
    }
    catch {
        console.error(chalk.red('Unable to connect to the database:', error));
    }
})
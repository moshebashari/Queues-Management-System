const { default: chalk } = require("chalk");
const express = require("express");
const path = require('path');
const PORT = 3000;
const { error } = require("console");
const { sequelize } = require('./utils/database');
const { sendMsgBack, allJewishHolidays } = require("./utils/utils");
require('dotenv').config();


const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send("Whatsapp with Node.js and webhooks")
    allJewishHolidays();
})

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];
    if (mode && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
})

app.post('/webhook', async (req, res) => {
    console.log(JSON.stringify(req.body, null, 2));
    const { entry } = req.body;
    if (!entry || entry.length === 0) {
        res.status(400).send('Invalid request');
    }
    // console.log(entry[0].changes)
    const { changes } = entry[0];
    if (!changes || changes.length === 0) {
        res.status(400).send('Invalid request');
    }

    const contact = changes[0].value.contacts ? changes[0].value.contacts[0] : null
    const messages = changes[0].value.messages ? changes[0].value.messages[0]: null

    if (contact && messages){
        const response = await sendMsgBack(contact, messages)
        if (response){
            res.status(200).send('webhook processed')
        }
    }

    // console.log(contact.profile.name, contact['wa_id']);
})

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
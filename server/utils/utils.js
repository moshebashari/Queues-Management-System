const axios = require('axios');
const { template } = require('lodash');
const { HebrewCalendar, Location, flags  } = require('@hebcal/core');


const sendMsgBack = async (contact, msg) => {
    if (msg.type !== 'text') {
        return null
    }
    const resposne = await axios({
        url: `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
        method: 'post',
        headers: {
            'Authorization': `Bearer: ${process.env.WA_ACCESS_TOKEN}`,
            "Content-Type": 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: `${contact['wa_id']}`,
            type: 'text',
            text: {
                body: `${msg.text.body} ${contact.profile.name}.`
            }
        })
    })
    return resposne
}

function fixHebrew(text) {
    return text.split('').reverse().join('');
}

const allJewishHolidays = () => {
    const options = {
        year: 2026,
        isHebrewYear: false,
        location: Location.lookup('Jerusalem'), // קובע שזה לפי לוח ישראל
        il: true, // מציין שאנחנו בישראל (חשוב מאוד לימי חופשה!)
    };

    const events = HebrewCalendar.calendar(options);
    console.log("ימי שבתון וחגים רשמיים בהם לא עובדים:");
    events.forEach(ev => {
        const mask = ev.getFlags();
         const isChag = mask & flags.CHAG;             // יום טוב (שבתון דתי)
    const isCholHaMoed = mask & flags.CHOL_HAMOED; // חול המועד
    const isModern = mask & flags.MODERN_HOLIDAY;  // חגים לאומיים (עצמאות)

    // סינון: רק יום טוב, חול המועד, או יום העצמאות
    if (isChag || isCholHaMoed || (isModern && ev.getDesc() === "Yom HaAtzma'ut")) {
        
        // מניעת כפילויות של "ערב חג" (אנחנו רוצים את החג עצמו)
        if (mask & flags.EREV) return; 

        const name = ev.render('he');
        const date = ev.getDate().greg().toLocaleDateString('he-IL');
        console.log(`${date} : ${fixHebrew(name)}`);
    }
    });
}

module.exports = {
    sendMsgBack,
    allJewishHolidays
}
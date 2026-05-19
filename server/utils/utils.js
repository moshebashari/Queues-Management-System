const axios = require('axios');
const { template } = require('lodash');
const { HDate, HebrewCalendar, Location, flags } = require('@hebcal/core');


function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        if (arr[mid] === target) {
            return mid; // האיבר נמצא, מחזיר את האינדקס
        }

        if (arr[mid] < target) {
            left = mid + 1; // מחפש בחצי הימני
        } else {
            right = mid - 1; // מחפש בחצי השמאלי
        }
    }

    return left; // האיבר לא נמצא במערך
}


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


const convertStrDateToDate = (origStrDate) => {
    let strDate = origStrDate;
    // remove * from the start and the end if exists.
    if (strDate[0] === '*') strDate = strDate.slice(1);
    if (strDate[strDate.length - 1] === '*') strDate = strDate.slice(0, -1);

    const dateNum = strDate.split('*')

    // if entered week day          1     4   
    if (dateNum.length === 1) {
        const weekDay = Number(dateNum[0]);
        if (weekDay < 1 || weekDay > 7) return 'Invalid date format';
        const currentDate = new Date();
        const currentDay = currentDate.getDay() + 1;
        const daysDiff = weekDay >= currentDay ? weekDay - currentDay : 7 - currentDay + weekDay;

        return new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + daysDiff);
    }

    // if entered date
    if (dateNum.length !== 2) return 'Invalid date format';
    const day = Number(dateNum[0]);
    const month = Number(dateNum[1]);

    if (month < 1 || month > 12) return 'Invalid month';
    const currentDate = new Date();
    let year = currentDate.getFullYear();
    // appointment to next year
    if (currentDate.getMonth() + 1 > month) year++;
    const date = new Date(year, month - 1, day);
    // check valid day
    if (date.getDate() !== day) return 'Invalid day';

    return date;
}

const checkEmployeesAppointmentWindow = (date, employees) => {

    const avaliableEmployees = [];

    for (let employee of employees) {
        const appWin = employee.booking_window;
        const currentDate = new Date();

        const year = appWin.unit === 'year' ? currentDate.getFullYear() + appWin.amount : currentDate.getFullYear();
        const month = appWin.unit === 'month' ? currentDate.getMonth() + appWin.amount : currentDate.getMonth();
        const day = appWin.unit === 'day' ? currentDate.getDate() + appWin.amount : currentDate.getDate();

        const appWinDate = new Date(year, month, day);

        if (date <= appWinDate) avaliableEmployees.push(employee);
    }

    return avaliableEmployees;
}

const checkDateForRestDay = (date) => {
    const hdate = new HDate(date);

    // שבת
    if (hdate.getDay() === 6) return 'shabat';

    const events = HebrewCalendar.calendar({
        start: hdate,
        end: hdate,
        il: true
    });

    for (const ev of events) {
        const mask = ev.getFlags();

        if (mask & flags.CHAG) return 'chag';
        if (mask & flags.CHOL_HAMOED) return 'chol_hamoed';
        // ערב חג
        if (mask & flags.LIGHT_CANDLES) return 'light_candles';
        if (ev.getDesc() === "Yom HaAtzma'ut") return 'yom_haatsmaut';

    }

    return false;
}

const allAvaliableApponintments = (allOptions, appointments) => {
    if (allOptions.length < appointments.length) {
        throw new Error("Something wrong - allOptions array can't be shorter than appointments array.")
    }
    const appFormated = appointments.map(app => `${app.appointment_time}-${app.employee_id}`)
    let i = 0;
    let j = 0;
    const avaApps = [];

    while (i < allOptions.length) {
        if (allOptions[i] < appFormated[j]) avaApps.push(allOptions[i]);
        else j++;
        i++;
    }

    return avaApps;
}

const bulidWorkingHoursArr = (employees) => {
    const workingHoursArr = [];

    for (let employee of employees) {
        workingHoursArr.push(...generateSlotsFromTime(employee));
    }

    return workingHoursArr.sort();
}

const generateSlotsFromTime = (employee) => {
    const slots = [];

    const workingHours = employee.workingHours;
    const appDur = employee.appointment_duration;
    for (let wh of workingHours) {
        const [h, m] = wh.startTime.split(':').map(Number);
        const [endH, endM] = wh.endTime.split(':').map(Number);

        let current = h * 60 + m; // start hour in minutes.
        const end = endH * 60 + m; // end hour in minutes.

        while (current + appDur <= end) {
            const hour = Math.floor(current / 60).toString().padStart(2, '0');
            const min = (current % 60).toString().padStart(2, '0');

            slots.push(`${hour}:${min}:00-${employee.id}`);
            current += appDur;
        }
    }

    return slots;
}

const generate8DigitsNumber = () => {
    return Math.floor(10000000 + Math.random() * 90000000)
}


const checkAvaliablesHours = (avaApps, hour) => {
    let avaHours = []
    let hasReqHours = true
    let i = 0;
    for (i; i < avaApps.length; i++) {
        const h = hour.length === 2 ? avaApps[i].split(':')[0] : avaApps[i].split('-')[0];
        if (h === hour) {
            avaHours.push({ hour: avaApps[i], index: i });
        }
        else if (h > hour) break;
    }

    if (avaHours.length === 0) {
        hasReqHours = false;
        const h = hour.slice(0, 2);
        console.log(h);
        if (i !== 0) {
            avaHours.push({ hour: avaApps[i - 1], index: i - 1 })
        }
        if (avaApps.length > i) {
            avaHours.push({ hour: avaApps[i], index: i })
        }
    }

    return {hasReqHours, avaHours};
}




const convertNumbersToHour = (hours) => {

    const isOnlyNumbers = /^\d+$/.test(hours);
    if (!isOnlyNumbers) return 'You must enter only digits'

    if (hours.length > 4) return 'Wrong format';

    if (hours.length < 3) {
        const h = hours.padStart(2, 0);
        if (h > '23') return 'Wrong format';
        return h;
    }

    const h = `${hours.slice(0, -2)}`.padStart(2, 0);
    const m = `${hours.slice(-2)}:00`;
    if (h > '23' || m > '59') return 'Wrong format';
    return h + ':' + m;

}

module.exports = {
    sendMsgBack,
    allJewishHolidays,
    convertStrDateToDate,
    checkEmployeesAppointmentWindow,
    checkDateForRestDay,
    allAvaliableApponintments,
    bulidWorkingHoursArr,
    generateSlotsFromTime,
    generate8DigitsNumber,
    checkAvaliablesHours,
    convertNumbersToHour
}
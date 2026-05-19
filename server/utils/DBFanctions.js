const { sequelize, BusinessShop, Employee, EmployeeConfigs, WorkingHours, Appointment } = require('../models');
const { Op } = require('sequelize');
const { generate8DigitsNumber } = require('./utils');

const getBusinessIdByPhoneNum = async (phoneNum) => {

    const businessId = await BusinessShop.findOne({
        row: true,
        attributes: ['id'],
        where: {
            [Op.or]: [
                { whatsappPhone: phoneNum },
                { ivrPhone: phoneNum }
            ]
        }
    })
    // console.log(businessId.toJSON())
    return businessId.toJSON()
}

const getEmployeesByBusinessId = async (businessId, employeeName = null, date = null) => {
    const whereClause = { businessId: businessId };
    let workingHoursInclude = [{ model: EmployeeConfigs, as: 'employeeConfigs', attributes: [] }]

    if (employeeName) {
        whereClause.name = employeeName;
    }

    if (date) {
        workingHoursInclude.push({
            model: WorkingHours,
            as: 'workingHours',
            where: { dayOfWeek: date.getDay() },
            order: [['start_time', 'ASC']]
        });
    }
    let allEmployees = null
    try {
        allEmployees = await Employee.findAll({
            row: true,
            nest: false,
            attributes: ['id', 'name', 'business_id', 'contact_phone',
                [sequelize.col('employeeConfigs.appointment_duration'), 'appointment_duration'],
                [sequelize.col('employeeConfigs.booking_window'), 'booking_window'],
            ],
            where: whereClause,
            include: workingHoursInclude,
            order: [['id', 'ASC']]
        })
    } catch (err) {
        console.log(err.message);
    }
    const employeesData = allEmployees.map(e => e.toJSON());

    // console.log(employeesData)
    return employeesData;
}

const getWorkingHoursByDay = async (date, businessId, employeeId) => {
    try {
        const allWorkingHours = await WorkingHours.findAll({
            row: true,
            nest: false,
            where: {
                businessId,
                employeeId,
                dayOfWeek: date.getDay()
            },
            order: [
                ['start_time', 'ASC']
            ]
        })

        const workingHoursData = allWorkingHours.map(wh => wh.toJSON())
        return workingHoursData;

    } catch (err) {
        console.log(err.message);
    }
}

const getAppointments = async (date, businessId, employeesId) => {

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        const allAppointments = await Appointment.findAll({
            row: true,
            attributes: [
                'employee_id',
                [sequelize.fn('TIME', sequelize.col('appointment_date_time')), 'appointment_time']
            ],
            where: {
                employeeId: {
                    [Op.in]: employeesId
                },
                appointmentDateTime: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            },
            order: [['appointment_date_time', 'ASC']]
        })

        const AppointmentData = allAppointments.map(app => app.toJSON());
        return AppointmentData;

    } catch (err) {
        console.log(err.message);
    }
}

const createNewEmployee = async (employeeData, workingHours, employeeConfigs) => {
    try {
        const result = await sequelize.transaction(async (t) => {

            const employee = await Employee.create(employeeData, { transaction: t });

            employeeConfigs.employeeId = employee.id;
            const configs = await EmployeeConfigs.create(employeeConfigs, { transaction: t });

            workingHours.forEach(element => {
                element.employeeId = employee.id;
            });

            const wh = await WorkingHours.bulkCreate(workingHours, { transaction: t });

            return { employee, configs, wh }

        })

        console.log('Employee create successfully.')
        return result;
    } catch (err) {
        console.log(err);
    }
}

const createNewAppointment = async (appointmentData) => {
    let inserted = false;
    let attempts = 0;
    const maxAttempts = 5;

    let appointment = null;

    while (!inserted && attempts < maxAttempts) {
        try {

            attempts++;
            const bookingCode = generate8DigitsNumber();

            appointment = await Appointment.create({
                bookingCode: 11335577,
                ...appointmentData,
            });

            inserted = true;
            console.log('Appointment created successfully')

        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                const failedIndex = err.errors[0]?.path;
                if (failedIndex === 'unique_code_per_business') {
                    console.warn('BookingCode already exists to this business. run another attmept.');
                }

                else if (failedIndex === 'idx_employee_date_active') {
                    console.error('The employee already booked on this date time');
                    throw new Error('The employee already booked on this date time');
                }
                else {
                    const errMsg = err.errors[0]?.message || '';
                    if (errMsg.includes('booking_code')) {
                        console.warn('BookingCode already exists to this business. run another attmept.');
                    }
                    else {
                        console.error('The employee already booked on this date time');
                        throw new Error('The employee already booked on this date time');
                    }
                }
            } else {
                throw err;
            }
        }
    }
}

const confirmedAppointment = async (updateData, whereData) => {
    try {
        const appointment = await Appointment.update(
            { ...updateData },
            {
                where: { ...whereData }
            }
        )

    } catch (err) {
        console.log(err)
    }
}


module.exports = {
    getBusinessIdByPhoneNum,
    getEmployeesByBusinessId,
    getWorkingHoursByDay,
    getAppointments,
    createNewEmployee,
    createNewAppointment,
    confirmedAppointment
}
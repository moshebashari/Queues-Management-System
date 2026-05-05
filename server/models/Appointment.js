const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const Appointment = sequelize.define('Appointments', {
        uuid: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
        },
        bookingCode: {
            allowNull: false,
            type: DataTypes.INTEGER,
        },
        businessId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'business_shops',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        appointmentDateTime: {
            allowNull: false,
            type: DataTypes.DATE,
            unique: true,
        },
        contactPhone: {
            allowNull: false,
            type: DataTypes.STRING(10),
        },
        name: {
            type: DataTypes.STRING(20)
        },
        bookingPhone: {
            allowNull: false,
            type: DataTypes.STRING(10),
        },
        status: {
            allowNull: false,
            type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
            defaultValue: 'pending'
        },
        hasNotifications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        notificationsOptions: {
            type: DataTypes.JSON,
            allowNull: true,
        }


    }, {
        indexes: [
            { fields: ['uuid'] },
            { unique: true, fields: ['business_id', 'booking_code'], name: 'unique_code_per_business'},
            { fields: ['appointment_date_time'] },
            { fields: ['has_notifications'] },
            { fields: ['business_id'] },
            { fields: ['empolyee_id'] },
            { name: 'employee_schedule_index', unique: true, fields: ['employee_id', 'appointment_date_time'] }
        ],
        underscored: true,
        tableName: 'appointments'
    })

    Appointment.associate = (models) => {
        Appointment.belongsTo(models.BusinessShop, { foreignKey: 'business_id' });
        Appointment.belongsTo(models.Employee, { foreignKey: 'empolyee_id' });
    }



    return Appointment
}
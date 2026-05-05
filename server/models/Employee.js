const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const Employee = sequelize.define('Employees', {
        id: {
            primaryKey: true,
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING(20)
        },
        businessId : {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'business_shops',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        employeeNum: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        contactPhone: {
            allowNull: false,
            type: DataTypes.STRING(10),
            unique: true,
        },

    }, {
        indexes: [
            {
                unique: true,
                fields: ['business_id', 'empolyee_num']
            }
        ],
        underscored: true,
        tableName: 'employees'
    })  

    Employee.associate = (models) => {
        Employee.belongsTo(models.BusinessShop, {foreignKey: 'business_id'});
        Employee.hasMany(models.Appointment, {foreignKey: 'employee_id', targetKey: 'id'});
        Employee.hasMany(models.WorkingHours, {foreignKey: 'employee_id', targetKey: 'id'});
    }
    
    return Employee
} 
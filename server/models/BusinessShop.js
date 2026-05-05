const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const BusinessShop = sequelize.define('BusinessShops', {
        id: {
            primaryKey: true,
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        uuid: {
            allowNull: false,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true
        },
        name: {
            allowNull: false,
            unique: true,
            type: DataTypes.STRING
        },
        ownerName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        whatsappPhone: {
            type: DataTypes.STRING(10),
        },
        voicePhone: {
            type: DataTypes.STRING(10),
        }

    }, {
        validate: {
            atleastOne() {
                if (!this.whatsappPhone && !this.voicePhone) {
                    throw new Error('At least one of the following fields is required: whatsappPhone or voicePhone')
                }
            }
        },
        underscored: true,
        tableName: 'business_shops'
    })

    BusinessShop.associate = (models) => {
        BusinessShop.hasMany(models.Employee, { foreignKey: 'business_id', targetKey: 'id' });
        BusinessShop.hasMany(models.WorkingHours, { foreignKey: 'business_id', targetKey: 'id' });
        BusinessShop.hasMany(models.Appointment, { foreignKey: 'business_id', targetKey: 'id' })
    }

    return BusinessShop;
}
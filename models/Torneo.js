const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Torneo = sequelize.define('Torneo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre del torneo es requerido' }
        }
    },
    ciudad: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'La ciudad es requerida' }
        }
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: 'Debe ser una fecha válida' }
        }
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('inscripciones', 'en_progreso', 'finalizado'),
        allowNull: false,
        defaultValue: 'inscripciones'
    }
}, {
    tableName: 'torneos',
    timestamps: true
});

module.exports = Torneo;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Escuela = sequelize.define('Escuela', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: {
            msg: 'Ya existe una escuela con este nombre'
        },
        validate: {
            notEmpty: { msg: 'El nombre de la escuela es requerido' }
        }
    },
    direccion: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    director: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: { msg: 'Debe ser un email valido' }
        }
    },
    activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    precio_mensualidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    logo: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'escuelas',
    timestamps: true
});

module.exports = Escuela;

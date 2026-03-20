const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre es requerido' }
        }
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: {
            msg: 'Este email ya está registrado'
        },
        validate: {
            isEmail: { msg: 'Debe ser un email válido' },
            notEmpty: { msg: 'El email es requerido' }
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'La contraseña es requerida' },
            len: {
                args: [6, 255],
                msg: 'La contraseña debe tener al menos 6 caracteres'
            }
        }
    },
    rol: {
        type: DataTypes.ENUM('superadmin', 'administrador', 'entrenador'),
        allowNull: false,
        defaultValue: 'entrenador'
    },
    escuela_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'escuelas',
            key: 'id'
        }
    }
}, {
    tableName: 'usuarios',
    timestamps: true
});

module.exports = Usuario;

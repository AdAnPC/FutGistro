const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Categoria = sequelize.define('Categoria', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
            msg: 'Ya existe una categoría con este nombre'
        },
        validate: {
            notEmpty: { msg: 'El nombre de la categoría es requerido' }
        }
    },
    edad_min: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: { msg: 'La edad mínima debe ser un número entero' },
            min: { args: [3], msg: 'La edad mínima debe ser al menos 3' }
        }
    },
    edad_max: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: { msg: 'La edad máxima debe ser un número entero' },
            max: { args: [18], msg: 'La edad máxima no puede superar 18' }
        }
    }
}, {
    tableName: 'categorias',
    timestamps: true
});

module.exports = Categoria;

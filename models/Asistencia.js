const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asistencia = sequelize.define('Asistencia', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    jugador_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'jugadores',
            key: 'id'
        }
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: 'Debe ser una fecha válida' }
        }
    },
    estado: {
        type: DataTypes.ENUM('presente', 'ausente', 'tardanza', 'justificado'),
        allowNull: false,
        defaultValue: 'presente'
    },
    observacion: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'asistencias',
    timestamps: true
});

module.exports = Asistencia;

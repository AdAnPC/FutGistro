const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Partido = sequelize.define('Partido', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    torneo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    escuela_local_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    escuela_visitante_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    nombre_local_manual: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Para casos donde el equipo no esté en el sistema'
    },
    nombre_visitante_manual: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    goles_local: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    goles_visitante: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    fecha_partido: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    hora: {
        type: DataTypes.TIME,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('programado', 'finalizado', 'cancelado'),
        allowNull: false,
        defaultValue: 'programado'
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'partidos',
    timestamps: true
});

module.exports = Partido;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TorneoParticipante = sequelize.define('TorneoParticipante', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    torneo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'torneos',
            key: 'id'
        }
    },
    escuela_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'escuelas',
            key: 'id'
        }
    },
    estado: {
        type: DataTypes.ENUM('invitado', 'pendiente', 'confirmado', 'rechazado'),
        allowNull: false,
        defaultValue: 'pendiente'
    }
}, {
    tableName: 'torneo_participantes',
    timestamps: true
});

module.exports = TorneoParticipante;

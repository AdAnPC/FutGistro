const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pago = sequelize.define('Pago', {
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
    mes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: { args: [1], msg: 'El mes debe ser entre 1 y 12' },
            max: { args: [12], msg: 'El mes debe ser entre 1 y 12' }
        }
    },
    anio: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: { args: [2020], msg: 'El año no es válido' }
        }
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: { args: [0], msg: 'El monto no puede ser negativo' }
        }
    },
    estado: {
        type: DataTypes.ENUM('pagado', 'pendiente'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    fecha_pago: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    metodo_pago: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    referencia: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'pagos',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['jugador_id', 'mes', 'anio']
        }
    ]
});

module.exports = Pago;

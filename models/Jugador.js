const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Jugador = sequelize.define('Jugador', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre completo es requerido' }
        }
    },
    fecha_nacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: 'Debe ser una fecha valida' }
        }
    },
    documento: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
            msg: 'Ya existe un jugador con este documento'
        },
        validate: {
            notEmpty: { msg: 'El numero de documento es requerido' }
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
    lugar_nacimiento: { type: DataTypes.STRING(100), allowNull: true },
    estatura: { type: DataTypes.STRING(20), allowNull: true },
    peso: { type: DataTypes.STRING(20), allowNull: true },
    tipo_sangre: { type: DataTypes.STRING(10), allowNull: true },
    eps: { type: DataTypes.STRING(100), allowNull: true },
    cc_padre: { type: DataTypes.STRING(50), allowNull: true },
    nombre_madre: { type: DataTypes.STRING(150), allowNull: true },
    cc_madre: { type: DataTypes.STRING(50), allowNull: true },
    ciudad: { type: DataTypes.STRING(100), allowNull: true },
    numero_fijo: { type: DataTypes.STRING(20), allowNull: true },
    nombre_padre: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    telefono_padre: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    escuela_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'escuelas',
            key: 'id'
        }
    },
    // === Archivos (maximo 5 documentos/fotos) ===
    foto: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    registro_civil: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    documento_acudiente: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    documento_extra1: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    documento_extra2: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    documento_extra3: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    documento_extra4: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    // === Firmas ===
    firma_padre: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    firma_entrenador: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    categoria_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'categorias',
            key: 'id'
        }
    },
    fecha_registro: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'jugadores',
    timestamps: true
});

// Virtual field to calculate age
Jugador.prototype.getEdad = function () {
    if (!this.fecha_nacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(this.fecha_nacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
};

module.exports = Jugador;

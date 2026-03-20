const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Jugador = require('./Jugador');
const Asistencia = require('./Asistencia');
const Escuela = require('./Escuela');
const Pago = require('./Pago');

// === Associations ===

// Categoria <-> Jugador (1:N)
Categoria.hasMany(Jugador, {
    foreignKey: 'categoria_id',
    as: 'jugadores',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
Jugador.belongsTo(Categoria, {
    foreignKey: 'categoria_id',
    as: 'categoria'
});

// Escuela <-> Jugador (1:N)
Escuela.hasMany(Jugador, {
    foreignKey: 'escuela_id',
    as: 'jugadores',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
Jugador.belongsTo(Escuela, {
    foreignKey: 'escuela_id',
    as: 'escuela'
});

// Jugador <-> Asistencia (1:N)
Jugador.hasMany(Asistencia, {
    foreignKey: 'jugador_id',
    as: 'asistencias',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Asistencia.belongsTo(Jugador, {
    foreignKey: 'jugador_id',
    as: 'jugador'
});

// Jugador <-> Pago (1:N)
Jugador.hasMany(Pago, {
    foreignKey: 'jugador_id',
    as: 'pagos',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Pago.belongsTo(Jugador, {
    foreignKey: 'jugador_id',
    as: 'jugador'
});

// Escuela <-> Usuario (1:N)
Escuela.hasMany(Usuario, {
    foreignKey: 'escuela_id',
    as: 'usuarios',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
Usuario.belongsTo(Escuela, {
    foreignKey: 'escuela_id',
    as: 'escuela'
});

module.exports = {
    sequelize,
    Usuario,
    Categoria,
    Jugador,
    Asistencia,
    Escuela,
    Pago
};

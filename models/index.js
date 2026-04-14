const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Jugador = require('./Jugador');
const Asistencia = require('./Asistencia');
const Escuela = require('./Escuela');
const Pago = require('./Pago');
const Torneo = require('./Torneo');
const TorneoParticipante = require('./TorneoParticipante');
const Partido = require('./Partido');

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

// Categoria <-> Torneo (1:N) - Un torneo es para una categoria
Categoria.hasMany(Torneo, {
    foreignKey: 'categoria_id',
    as: 'torneos'
});
Torneo.belongsTo(Categoria, {
    foreignKey: 'categoria_id',
    as: 'categoria'
});

// Escuela <-> Torneo (Organizer)
Escuela.hasMany(Torneo, {
    foreignKey: 'organizador_id',
    as: 'torneos_organizados'
});
Torneo.belongsTo(Escuela, {
    foreignKey: 'organizador_id',
    as: 'organizador'
});

// Torneo <-> TorneoParticipante (1:N)
Torneo.hasMany(TorneoParticipante, {
    foreignKey: 'torneo_id',
    as: 'participantes'
});
TorneoParticipante.belongsTo(Torneo, {
    foreignKey: 'torneo_id',
    as: 'torneo'
});

// Escuela <-> TorneoParticipante (1:N)
Escuela.hasMany(TorneoParticipante, {
    foreignKey: 'escuela_id',
    as: 'participaciones_torneos'
});
TorneoParticipante.belongsTo(Escuela, {
    foreignKey: 'escuela_id',
    as: 'escuela'
});

// Torneo <-> Partido (1:N)
Torneo.hasMany(Partido, {
    foreignKey: 'torneo_id',
    as: 'partidos'
});
Partido.belongsTo(Torneo, {
    foreignKey: 'torneo_id',
    as: 'torneo'
});

// Escuela <-> Partido (Local vs Visitante)
Partido.belongsTo(Escuela, {
    foreignKey: 'escuela_local_id',
    as: 'escuela_local'
});
Partido.belongsTo(Escuela, {
    foreignKey: 'escuela_visitante_id',
    as: 'escuela_visitante'
});

module.exports = {
    sequelize,
    Usuario,
    Categoria,
    Jugador,
    Asistencia,
    Escuela,
    Pago,
    Torneo,
    TorneoParticipante,
    Partido
};

const { pgTable, serial, text, integer, varchar, boolean, decimal, timestamp, date, time, pgEnum } = require("drizzle-orm/pg-core");
const { relations } = require('drizzle-orm');

// Enums
const rolEnum = pgEnum('rol', ['superadmin', 'administrador', 'entrenador']);
const asistenciaEstadoEnum = pgEnum('asistencia_estado', ['presente', 'ausente', 'tardanza', 'justificado']);
const pagoEstadoEnum = pgEnum('pago_estado', ['pagado', 'pendiente']);
const partidoEstadoEnum = pgEnum('partido_estado', ['programado', 'finalizado', 'cancelado']);
const torneoEstadoEnum = pgEnum('torneo_estado', ['inscripciones', 'en_progreso', 'finalizado']);
const participanteEstadoEnum = pgEnum('participante_estado', ['invitado', 'pendiente', 'confirmado', 'rechazado']);

// Escuelas
const escuelas = pgTable('escuelas', {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 150 }).notNull().unique(),
    direccion: varchar('direccion', { length: 255 }),
    departamento: varchar('departamento', { length: 100 }),
    ciudad: varchar('ciudad', { length: 100 }),
    telefono: varchar('telefono', { length: 20 }),
    director: varchar('director', { length: 150 }),
    email: varchar('email', { length: 100 }),
    activa: boolean('activa').notNull().default(true),
    precio_mensualidad: decimal('precio_mensualidad', { precision: 10, scale: 2 }).notNull().default('0.00'),
    logo: varchar('logo', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Usuarios
const usuarios = pgTable('usuarios', {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    email: varchar('email', { length: 100 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    rol: rolEnum('rol').notNull().default('entrenador'),
    escuela_id: integer('escuela_id').references(() => escuelas.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Categorias
const categorias = pgTable('categorias', {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 50 }).notNull().unique(),
    edad_min: integer('edad_min').notNull(),
    edad_max: integer('edad_max').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Jugadores
const jugadores = pgTable('jugadores', {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 150 }).notNull(),
    fecha_nacimiento: date('fecha_nacimiento').notNull(),
    documento: varchar('documento', { length: 50 }).notNull().unique(),
    direccion: varchar('direccion', { length: 255 }),
    telefono: varchar('telefono', { length: 20 }),
    lugar_nacimiento: varchar('lugar_nacimiento', { length: 100 }),
    departamento_nacimiento: varchar('departamento_nacimiento', { length: 100 }),
    estatura: varchar('estatura', { length: 20 }),
    peso: varchar('peso', { length: 20 }),
    tipo_sangre: varchar('tipo_sangre', { length: 10 }),
    eps: varchar('eps', { length: 100 }),
    cc_padre: varchar('cc_padre', { length: 50 }),
    nombre_madre: varchar('nombre_madre', { length: 150 }),
    cc_madre: varchar('cc_madre', { length: 50 }),
    departamento_residencia: varchar('departamento_residencia', { length: 100 }),
    ciudad: varchar('ciudad', { length: 100 }),
    numero_fijo: varchar('numero_fijo', { length: 20 }),
    nombre_padre: varchar('nombre_padre', { length: 150 }),
    telefono_padre: varchar('telefono_padre', { length: 20 }),
    escuela_id: integer('escuela_id').references(() => escuelas.id),
    
    // Archivos
    foto: varchar('foto', { length: 255 }),
    registro_civil: varchar('registro_civil', { length: 255 }),
    documento_acudiente: varchar('documento_acudiente', { length: 255 }),
    documento_extra1: varchar('documento_extra1', { length: 255 }),
    documento_extra2: varchar('documento_extra2', { length: 255 }),
    documento_extra3: varchar('documento_extra3', { length: 255 }),
    documento_extra4: varchar('documento_extra4', { length: 255 }),
    
    // Firmas
    firma_padre: varchar('firma_padre', { length: 255 }),
    firma_entrenador: varchar('firma_entrenador', { length: 255 }),
    
    categoria_id: integer('categoria_id').references(() => categorias.id),
    fecha_registro: date('fecha_registro').defaultNow().notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Asistencias
const asistencias = pgTable('asistencias', {
    id: serial('id').primaryKey(),
    jugador_id: integer('jugador_id').notNull().references(() => jugadores.id),
    fecha: date('fecha').notNull(),
    estado: asistenciaEstadoEnum('estado').notNull().default('presente'),
    observacion: varchar('observacion', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Pagos
const pagos = pgTable('pagos', {
    id: serial('id').primaryKey(),
    jugador_id: integer('jugador_id').notNull().references(() => jugadores.id),
    mes: integer('mes').notNull(),
    anio: integer('anio').notNull(),
    monto: decimal('monto', { precision: 10, scale: 2 }).notNull().default('0.00'),
    estado: pagoEstadoEnum('estado').notNull().default('pendiente'),
    fecha_pago: date('fecha_pago'),
    metodo_pago: varchar('metodo_pago', { length: 50 }),
    referencia: varchar('referencia', { length: 100 }),
    notas: text('notas'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Torneos
const torneos = pgTable('torneos', {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 150 }).notNull(),
    ciudad: varchar('ciudad', { length: 100 }).notNull(),
    fecha: date('fecha').notNull(),
    descripcion: text('descripcion'),
    estado: torneoEstadoEnum('estado').notNull().default('inscripciones'),
    categoria_id: integer('categoria_id').references(() => categorias.id),
    organizador_id: integer('organizador_id').references(() => escuelas.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Torneo Participantes
const torneo_participantes = pgTable('torneo_participantes', {
    id: serial('id').primaryKey(),
    torneo_id: integer('torneo_id').notNull().references(() => torneos.id),
    escuela_id: integer('escuela_id').notNull().references(() => escuelas.id),
    estado: participanteEstadoEnum('estado').notNull().default('pendiente'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Partidos
const partidos = pgTable('partidos', {
    id: serial('id').primaryKey(),
    torneo_id: integer('torneo_id').notNull().references(() => torneos.id),
    escuela_local_id: integer('escuela_local_id').references(() => escuelas.id),
    escuela_visitante_id: integer('escuela_visitante_id').references(() => escuelas.id),
    nombre_local_manual: varchar('nombre_local_manual', { length: 100 }),
    nombre_visitante_manual: varchar('nombre_visitante_manual', { length: 100 }),
    goles_local: integer('goles_local').default(0),
    goles_visitante: integer('goles_visitante').default(0),
    fecha_partido: date('fecha_partido'),
    hora: time('hora'),
    estado: partidoEstadoEnum('estado').notNull().default('programado'),
    observaciones: text('observaciones'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Backups automáticos del sistema
const system_backups = pgTable('system_backups', {
    id: serial('id').primaryKey(),
    datos: text('datos').notNull(),           // JSON completo del backup
    total_registros: integer('total_registros').notNull().default(0),
    tamano_kb: integer('tamano_kb').notNull().default(0),
    tipo: varchar('tipo', { length: 20 }).notNull().default('automatico'), // 'automatico' | 'manual'
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// Relations
const escuelasRelations = relations(escuelas, ({ many }) => ({
    usuarios: many(usuarios),
    jugadores: many(jugadores)
}));

const categoriasRelations = relations(categorias, ({ many }) => ({
    jugadores: many(jugadores),
    torneos: many(torneos)
}));

const jugadoresRelations = relations(jugadores, ({ one, many }) => ({
    escuela: one(escuelas, {
        fields: [jugadores.escuela_id],
        references: [escuelas.id]
    }),
    categoria: one(categorias, {
        fields: [jugadores.categoria_id],
        references: [categorias.id]
    }),
    asistencias: many(asistencias),
    pagos: many(pagos)
}));

const asistenciasRelations = relations(asistencias, ({ one }) => ({
    jugador: one(jugadores, {
        fields: [asistencias.jugador_id],
        references: [jugadores.id]
    })
}));

const pagosRelations = relations(pagos, ({ one }) => ({
    jugador: one(jugadores, {
        fields: [pagos.jugador_id],
        references: [jugadores.id]
    })
}));

const usuariosRelations = relations(usuarios, ({ one }) => ({
    escuela: one(escuelas, {
        fields: [usuarios.escuela_id],
        references: [escuelas.id]
    })
}));

const torneosRelations = relations(torneos, ({ one, many }) => ({
    categoria: one(categorias, {
        fields: [torneos.categoria_id],
        references: [categorias.id]
    }),
    organizador: one(escuelas, {
        fields: [torneos.organizador_id],
        references: [escuelas.id]
    }),
    participantes: many(torneo_participantes),
    partidos: many(partidos)
}));

const torneoParticipantesRelations = relations(torneo_participantes, ({ one }) => ({
    torneo: one(torneos, {
        fields: [torneo_participantes.torneo_id],
        references: [torneos.id]
    }),
    escuela: one(escuelas, {
        fields: [torneo_participantes.escuela_id],
        references: [escuelas.id]
    })
}));

const partidosRelations = relations(partidos, ({ one }) => ({
    torneo: one(torneos, {
        fields: [partidos.torneo_id],
        references: [torneos.id]
    }),
    escuela_local: one(escuelas, {
        fields: [partidos.escuela_local_id],
        references: [escuelas.id]
    }),
    escuela_visitante: one(escuelas, {
        fields: [partidos.escuela_visitante_id],
        references: [escuelas.id]
    })
}));

module.exports = {
    rolEnum,
    asistenciaEstadoEnum,
    pagoEstadoEnum,
    partidoEstadoEnum,
    torneoEstadoEnum,
    participanteEstadoEnum,
    escuelas,
    usuarios,
    categorias,
    jugadores,
    asistencias,
    pagos,
    torneos,
    torneo_participantes,
    partidos,
    system_backups,
    escuelasRelations,
    categoriasRelations,
    jugadoresRelations,
    asistenciasRelations,
    pagosRelations,
    usuariosRelations,
    torneosRelations,
    torneoParticipantesRelations,
    partidosRelations
};

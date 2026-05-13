const { db } = require('../db');
const { asistencias, jugadores } = require('../db/schema.js');
const { eq, and, desc, inArray } = require('drizzle-orm');

const asistenciaService = {
    getJugadorEscuelaFilter: (user) => {
        if (user.rol === 'superadmin') return null;
        if (user.escuela_id) return eq(jugadores.escuela_id, user.escuela_id);
        return eq(jugadores.id, -1);
    },

    listAttendance: async (query, user) => {
        const { fecha, categoria_id, jugador_id } = query;
        const escuelaFilter = asistenciaService.getJugadorEscuelaFilter(user);

        let asisWhere = [];
        if (fecha) asisWhere.push(eq(asistencias.fecha, fecha));
        if (jugador_id) asisWhere.push(eq(asistencias.jugador_id, parseInt(jugador_id)));

        let jugWhere = [];
        if (escuelaFilter) jugWhere.push(escuelaFilter);
        if (categoria_id) jugWhere.push(eq(jugadores.categoria_id, parseInt(categoria_id)));

        const listaAsistencias = await db.query.asistencias.findMany({
            where: asisWhere.length > 0 ? and(...asisWhere) : undefined,
            with: {
                jugador: {
                    columns: { id: true, nombre: true, foto: true, categoria_id: true, escuela_id: true },
                    where: jugWhere.length > 0 ? and(...jugWhere) : undefined,
                    with: { categoria: { columns: { id: true, nombre: true } } }
                }
            },
            orderBy: [desc(asistencias.fecha), desc(asistencias.createdAt)]
        });

        return listaAsistencias.filter(a => a.jugador !== null);
    },

    registerAttendance: async (data, user) => {
        let { fecha, asistencias: asistenciasList } = data;
        
        fecha = new Date(fecha).toISOString().split('T')[0];
        const jugadorIds = asistenciasList.map(a => parseInt(a.jugador_id));

        if (user.rol !== 'superadmin' && user.escuela_id) {
            const checkJugadores = await db.query.jugadores.findMany({
                where: and(inArray(jugadores.id, jugadorIds), eq(jugadores.escuela_id, user.escuela_id)),
                columns: { id: true }
            });
            
            if (checkJugadores.length !== jugadorIds.length) {
                const err = new Error('No puedes registrar asistencia de jugadores de otra escuela');
                err.statusCode = 403;
                throw err;
            }
        }

        await db.delete(asistencias).where(and(eq(asistencias.fecha, fecha), inArray(asistencias.jugador_id, jugadorIds)));

        const registros = asistenciasList.map(a => ({
            jugador_id: parseInt(a.jugador_id),
            fecha,
            estado: a.estado || 'presente',
            observacion: a.observacion || null
        }));

        if(registros.length > 0) {
            await db.insert(asistencias).values(registros);
        }

        return true;
    },

    getHistory: async (jugadorId, user) => {
        const jugador = await db.query.jugadores.findFirst({
            where: eq(jugadores.id, jugadorId),
            with: { categoria: { columns: { nombre: true } } }
        });

        if (!jugador) return null;

        if (user.rol !== 'superadmin' && user.escuela_id && jugador.escuela_id !== user.escuela_id) {
            const err = new Error('Unauthorized');
            err.statusCode = 403;
            throw err;
        }

        const historialAsistencias = await db.query.asistencias.findMany({
            where: eq(asistencias.jugador_id, jugadorId),
            orderBy: [desc(asistencias.fecha)]
        });

        const total = historialAsistencias.length;
        const resumen = {
            total,
            presentes: historialAsistencias.filter(a => a.estado === 'presente').length,
            ausentes: historialAsistencias.filter(a => a.estado === 'ausente').length,
            tardanzas: historialAsistencias.filter(a => a.estado === 'tardanza').length,
            justificados: historialAsistencias.filter(a => a.estado === 'justificado').length
        };

        return {
            jugador: {
                id: jugador.id,
                nombre: jugador.nombre,
                categoria: jugador.categoria ? jugador.categoria.nombre : 'Sin categoría'
            },
            resumen,
            registros: historialAsistencias
        };
    },

    deleteAttendance: async (id, user) => {
        const asistencia = await db.query.asistencias.findFirst({
            where: eq(asistencias.id, id),
            with: { jugador: { columns: { escuela_id: true } } }
        });

        if (!asistencia) return null;

        if (user.rol !== 'superadmin' && user.escuela_id &&
            asistencia.jugador && asistencia.jugador.escuela_id !== user.escuela_id) {
            const err = new Error('Unauthorized');
            err.statusCode = 403;
            throw err;
        }

        await db.delete(asistencias).where(eq(asistencias.id, id));
        return true;
    }
};

module.exports = asistenciaService;

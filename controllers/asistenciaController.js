const { db } = require('../db');
const { asistencias, jugadores, categorias } = require('../db/schema.js');
const { eq, and, desc, asc, inArray } = require('drizzle-orm');

// Helper: Get escuela filter condition for jugador
function getJugadorEscuelaFilter(user) {
    if (user.rol === 'superadmin') return null;
    if (user.escuela_id) return eq(jugadores.escuela_id, user.escuela_id);
    return eq(jugadores.id, -1);
}

const asistenciaController = {
    // GET /asistencia/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/asistencia' });
    },

    // GET /api/asistencia
    listar: async (req, res) => {
        try {
            const { fecha, categoria_id, jugador_id } = req.query;
            const escuelaFilter = getJugadorEscuelaFilter(req.user);

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

            // Filter out asistencias where the joined jugador is null (due to conditions)
            const filteredAsistencias = listaAsistencias.filter(a => a.jugador !== null);

            res.json({ success: true, data: filteredAsistencias });
        } catch (error) {
            console.error('Error listando asistencias:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // POST /api/asistencia
    registrar: async (req, res) => {
        try {
            let { fecha, asistencias: asistenciasList } = req.body;

            if (!fecha || !asistenciasList || !Array.isArray(asistenciasList)) {
                return res.status(400).json({
                    success: false,
                    message: 'Fecha y lista de asistencias son requeridas'
                });
            }
            
            fecha = new Date(fecha).toISOString().split('T')[0];

            // Security: verify all jugador_ids belong to the user's school
            const jugadorIds = asistenciasList.map(a => parseInt(a.jugador_id));
            if (req.user.rol !== 'superadmin' && req.user.escuela_id) {
                const checkJugadores = await db.query.jugadores.findMany({
                    where: and(inArray(jugadores.id, jugadorIds), eq(jugadores.escuela_id, req.user.escuela_id)),
                    columns: { id: true }
                });
                
                if (checkJugadores.length !== jugadorIds.length) {
                    return res.status(403).json({
                        success: false,
                        message: 'No puedes registrar asistencia de jugadores de otra escuela'
                    });
                }
            }

            // Delete existing records for this date
            await db.delete(asistencias).where(and(eq(asistencias.fecha, fecha), inArray(asistencias.jugador_id, jugadorIds)));

            // Create new attendance records
            const registros = asistenciasList.map(a => ({
                jugador_id: parseInt(a.jugador_id),
                fecha,
                estado: a.estado || 'presente',
                observacion: a.observacion || null
            }));

            if(registros.length > 0) {
                await db.insert(asistencias).values(registros);
            }

            res.json({ success: true, message: 'Asistencia registrada exitosamente' });
        } catch (error) {
            console.error('Error registrando asistencia:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /api/asistencia/historial/:jugadorId
    historial: async (req, res) => {
        try {
            const jugadorId = parseInt(req.params.jugadorId);
            const jugador = await db.query.jugadores.findFirst({
                where: eq(jugadores.id, jugadorId),
                with: { categoria: { columns: { nombre: true } } }
            });

            if (!jugador) {
                return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
            }

            // Security check
            if (req.user.rol !== 'superadmin' && req.user.escuela_id && jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para ver este jugador' });
            }

            const historialAsistencias = await db.query.asistencias.findMany({
                where: eq(asistencias.jugador_id, jugadorId),
                orderBy: [desc(asistencias.fecha)]
            });

            const total = historialAsistencias.length;
            const presentes = historialAsistencias.filter(a => a.estado === 'presente').length;
            const ausentes = historialAsistencias.filter(a => a.estado === 'ausente').length;
            const tardanzas = historialAsistencias.filter(a => a.estado === 'tardanza').length;
            const justificados = historialAsistencias.filter(a => a.estado === 'justificado').length;

            res.json({
                success: true,
                data: {
                    jugador: {
                        id: jugador.id,
                        nombre: jugador.nombre,
                        categoria: jugador.categoria ? jugador.categoria.nombre : 'Sin categoría'
                    },
                    resumen: { total, presentes, ausentes, tardanzas, justificados },
                    registros: historialAsistencias
                }
            });
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /api/asistencia/por-fecha/:fecha
    porFecha: async (req, res) => {
        try {
            const fecha = req.params.fecha;
            const { categoria_id } = req.query;
            const escuelaFilter = getJugadorEscuelaFilter(req.user);

            let jugWhere = [];
            if (escuelaFilter) jugWhere.push(escuelaFilter);
            if (categoria_id) jugWhere.push(eq(jugadores.categoria_id, parseInt(categoria_id)));

            const listaAsistencias = await db.query.asistencias.findMany({
                where: eq(asistencias.fecha, fecha),
                with: {
                    jugador: {
                        columns: { id: true, nombre: true, foto: true, categoria_id: true, escuela_id: true },
                        where: jugWhere.length > 0 ? and(...jugWhere) : undefined,
                        with: { categoria: { columns: { id: true, nombre: true } } }
                    }
                }
            });
            
            const filteredAsistencias = listaAsistencias.filter(a => a.jugador !== null);
            filteredAsistencias.sort((a, b) => a.jugador.nombre.localeCompare(b.jugador.nombre));

            res.json({ success: true, data: filteredAsistencias });
        } catch (error) {
            console.error('Error obteniendo asistencia por fecha:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /api/asistencia/:id
    eliminar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const asistencia = await db.query.asistencias.findFirst({
                where: eq(asistencias.id, id),
                with: { jugador: { columns: { escuela_id: true } } }
            });
            if (!asistencia) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            // Security check
            if (req.user.rol !== 'superadmin' && req.user.escuela_id &&
                asistencia.jugador && asistencia.jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso' });
            }

            await db.delete(asistencias).where(eq(asistencias.id, id));
            res.json({ success: true, message: 'Registro eliminado' });
        } catch (error) {
            console.error('Error eliminando asistencia:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

module.exports = asistenciaController;

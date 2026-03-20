const { Asistencia, Jugador, Categoria } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Helper: Get escuela filter condition for jugador
function getJugadorEscuelaFilter(user) {
    if (user.rol === 'superadmin') return {};
    if (user.escuela_id) return { escuela_id: user.escuela_id };
    return { id: -1 };
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
            const where = {};
            const escuelaFilter = getJugadorEscuelaFilter(req.user);

            if (fecha) where.fecha = fecha;
            if (jugador_id) where.jugador_id = jugador_id;

            const jugadorWhere = { ...escuelaFilter };
            if (categoria_id) jugadorWhere.categoria_id = categoria_id;

            const include = [{
                model: Jugador,
                as: 'jugador',
                attributes: ['id', 'nombre', 'foto', 'categoria_id', 'escuela_id'],
                where: Object.keys(jugadorWhere).length > 0 ? jugadorWhere : undefined,
                include: [{
                    model: Categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre']
                }]
            }];

            const asistencias = await Asistencia.findAll({
                where,
                include,
                order: [['fecha', 'DESC'], ['created_at', 'DESC']]
            });

            res.json({ success: true, data: asistencias });
        } catch (error) {
            console.error('Error listando asistencias:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // POST /api/asistencia
    registrar: async (req, res) => {
        try {
            const { fecha, asistencias } = req.body;

            if (!fecha || !asistencias || !Array.isArray(asistencias)) {
                return res.status(400).json({
                    success: false,
                    message: 'Fecha y lista de asistencias son requeridas'
                });
            }

            // Security: verify all jugador_ids belong to the user's school
            if (req.user.rol !== 'superadmin' && req.user.escuela_id) {
                const jugadorIds = asistencias.map(a => a.jugador_id);
                const jugadoresValidos = await Jugador.count({
                    where: {
                        id: { [Op.in]: jugadorIds },
                        escuela_id: req.user.escuela_id
                    }
                });
                if (jugadoresValidos !== jugadorIds.length) {
                    return res.status(403).json({
                        success: false,
                        message: 'No puedes registrar asistencia de jugadores de otra escuela'
                    });
                }
            }

            // Delete existing records for this date to allow re-registration
            const jugadorIds = asistencias.map(a => a.jugador_id);
            await Asistencia.destroy({
                where: {
                    fecha,
                    jugador_id: { [Op.in]: jugadorIds }
                }
            });

            // Create new attendance records
            const registros = asistencias.map(a => ({
                jugador_id: a.jugador_id,
                fecha,
                estado: a.estado || 'presente',
                observacion: a.observacion || null
            }));

            await Asistencia.bulkCreate(registros);

            res.json({ success: true, message: 'Asistencia registrada exitosamente' });
        } catch (error) {
            console.error('Error registrando asistencia:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /api/asistencia/historial/:jugadorId
    historial: async (req, res) => {
        try {
            const { jugadorId } = req.params;
            const jugador = await Jugador.findByPk(jugadorId, {
                include: [{ model: Categoria, as: 'categoria', attributes: ['nombre'] }]
            });

            if (!jugador) {
                return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
            }

            // Security check
            if (req.user.rol !== 'superadmin' && req.user.escuela_id && jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para ver este jugador' });
            }

            const asistencias = await Asistencia.findAll({
                where: { jugador_id: jugadorId },
                order: [['fecha', 'DESC']]
            });

            const total = asistencias.length;
            const presentes = asistencias.filter(a => a.estado === 'presente').length;
            const ausentes = asistencias.filter(a => a.estado === 'ausente').length;
            const tardanzas = asistencias.filter(a => a.estado === 'tardanza').length;
            const justificados = asistencias.filter(a => a.estado === 'justificado').length;

            res.json({
                success: true,
                data: {
                    jugador: {
                        id: jugador.id,
                        nombre: jugador.nombre,
                        categoria: jugador.categoria ? jugador.categoria.nombre : 'Sin categoría'
                    },
                    resumen: { total, presentes, ausentes, tardanzas, justificados },
                    registros: asistencias
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
            const { fecha } = req.params;
            const { categoria_id } = req.query;
            const escuelaFilter = getJugadorEscuelaFilter(req.user);

            const jugadorWhere = { ...escuelaFilter };
            if (categoria_id) jugadorWhere.categoria_id = categoria_id;

            const asistencias = await Asistencia.findAll({
                where: { fecha },
                include: [{
                    model: Jugador,
                    as: 'jugador',
                    attributes: ['id', 'nombre', 'foto', 'categoria_id', 'escuela_id'],
                    where: Object.keys(jugadorWhere).length > 0 ? jugadorWhere : undefined,
                    include: [{
                        model: Categoria,
                        as: 'categoria',
                        attributes: ['id', 'nombre']
                    }]
                }],
                order: [[{ model: Jugador, as: 'jugador' }, 'nombre', 'ASC']]
            });

            res.json({ success: true, data: asistencias });
        } catch (error) {
            console.error('Error obteniendo asistencia por fecha:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /api/asistencia/:id
    eliminar: async (req, res) => {
        try {
            const asistencia = await Asistencia.findByPk(req.params.id, {
                include: [{ model: Jugador, as: 'jugador', attributes: ['escuela_id'] }]
            });
            if (!asistencia) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            // Security check
            if (req.user.rol !== 'superadmin' && req.user.escuela_id &&
                asistencia.jugador && asistencia.jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso' });
            }

            await asistencia.destroy();
            res.json({ success: true, message: 'Registro eliminado' });
        } catch (error) {
            console.error('Error eliminando asistencia:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

module.exports = asistenciaController;

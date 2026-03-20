const { Pago, Jugador, Categoria, Escuela } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper: Get escuela filter condition for jugador
function getJugadorEscuelaFilter(user) {
    if (user.rol === 'superadmin') return {};
    if (user.escuela_id) return { escuela_id: user.escuela_id };
    return { id: -1 };
}

const pagoController = {
    // GET /pagos/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/pagos' });
    },

    // GET /pagos/api - Listar pagos con filtros
    listar: async (req, res) => {
        try {
            const { mes, anio, estado, jugador_id, categoria_id, escuela_id, search } = req.query;
            const where = {};
            const escuelaFilter = getJugadorEscuelaFilter(req.user);
            const jugadorWhere = { ...escuelaFilter };

            if (mes) where.mes = parseInt(mes);
            if (anio) where.anio = parseInt(anio);
            if (estado) where.estado = estado;
            if (jugador_id) where.jugador_id = parseInt(jugador_id);

            // === Auto-generación de pagos del mes (al listar pagos del mes actual) ===
            const fechaActual = new Date();
            const mesActual = fechaActual.getMonth() + 1;
            const anioActual = fechaActual.getFullYear();
            
            if (parseInt(mes) === mesActual && parseInt(anio) === anioActual) {
                const jugadoresSinPago = await Jugador.findAll({
                    where: escuelaFilter,
                    include: [{
                        model: Escuela,
                        as: 'escuela',
                        attributes: ['precio_mensualidad']
                    }, {
                       model: Pago,
                       as: 'pagos',
                       where: { mes: mesActual, anio: anioActual },
                       required: false
                    }]
                });

                const pagosFaltantes = jugadoresSinPago.filter(j => !j.pagos || j.pagos.length === 0);
                if (pagosFaltantes.length > 0) {
                    const nuevosPagos = pagosFaltantes.map(j => ({
                        jugador_id: j.id,
                        mes: mesActual,
                        anio: anioActual,
                        monto: j.escuela ? (parseFloat(j.escuela.precio_mensualidad) || 0) : 0,
                        estado: 'pendiente'
                    }));
                    await Pago.bulkCreate(nuevosPagos);
                }
            }
            // ==========================================

            if (search) {
                jugadorWhere.nombre = { [Op.like]: `%${search}%` };
            }

            const includeOptions = [{
                model: Jugador,
                as: 'jugador',
                attributes: ['id', 'nombre', 'documento', 'foto', 'categoria_id', 'escuela_id'],
                where: Object.keys(jugadorWhere).length > 0 ? jugadorWhere : undefined,
                include: [
                    { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
                    { model: Escuela, as: 'escuela', attributes: ['id', 'nombre'] }
                ]
            }];

            // Filter by categoria through jugador (only if superadmin or explicit escuela_id filter)
            if (categoria_id) {
                includeOptions[0].where = {
                    ...includeOptions[0].where,
                    categoria_id: parseInt(categoria_id)
                };
            }
            // Superadmin can filter by escuela_id explicitly
            if (escuela_id && req.user.rol === 'superadmin') {
                includeOptions[0].where = {
                    ...includeOptions[0].where,
                    escuela_id: parseInt(escuela_id)
                };
            }

            const pagos = await Pago.findAll({
                where,
                include: includeOptions,
                order: [['anio', 'DESC'], ['mes', 'DESC'], ['jugador_id', 'ASC']]
            });

            res.json({ success: true, data: pagos });
        } catch (error) {
            console.error('Error listando pagos:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // POST /pagos/api/generar - Generar pagos del mes para jugadores de la escuela
    generar: async (req, res) => {
        try {
            const { mes, anio, monto } = req.body;

            if (!mes || !anio) {
                return res.status(400).json({ success: false, message: 'Mes y año son requeridos' });
            }

            // Get players filtered by school
            const escuelaFilter = getJugadorEscuelaFilter(req.user);
            const jugadores = await Jugador.findAll({
                attributes: ['id', 'escuela_id'],
                where: Object.keys(escuelaFilter).length > 0 ? escuelaFilter : undefined,
                include: [{ model: Escuela, as: 'escuela', attributes: ['precio_mensualidad'] }]
            });

            if (jugadores.length === 0) {
                return res.status(400).json({ success: false, message: 'No hay jugadores registrados en tu escuela' });
            }

            let creados = 0;
            let existentes = 0;

            for (const jugador of jugadores) {
                const pagoMonto = monto ? parseFloat(monto) : (jugador.escuela ? parseFloat(jugador.escuela.precio_mensualidad) : 0) || 0;
                
                const [pago, created] = await Pago.findOrCreate({
                    where: {
                        jugador_id: jugador.id,
                        mes: parseInt(mes),
                        anio: parseInt(anio)
                    },
                    defaults: {
                        monto: pagoMonto,
                        estado: 'pendiente'
                    }
                });

                if (created) {
                    creados++;
                } else {
                    existentes++;
                }
            }

            res.json({
                success: true,
                message: `Se generaron ${creados} pagos para ${MESES[parseInt(mes)]} ${anio}. ${existentes} ya existían.`,
                data: { creados, existentes }
            });
        } catch (error) {
            console.error('Error generando pagos:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /pagos/api/:id - Actualizar un pago (marcar como pagado/pendiente)
    actualizar: async (req, res) => {
        try {
            const pago = await Pago.findByPk(req.params.id, {
                include: [{ 
                    model: Jugador, 
                    as: 'jugador', 
                    attributes: ['escuela_id'],
                    include: [{ model: Escuela, as: 'escuela', attributes: ['precio_mensualidad'] }]
                }]
            });

            if (!pago) {
                return res.status(404).json({ success: false, message: 'Pago no encontrado' });
            }

            // Security check
            if (req.user.rol !== 'superadmin' && req.user.escuela_id &&
                pago.jugador && pago.jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso' });
            }

            const updateData = { ...req.body };

            // If marking as paid and no fecha_pago provided, use today
            if (updateData.estado === 'pagado' && !updateData.fecha_pago) {
                updateData.fecha_pago = new Date().toISOString().split('T')[0];
            }

            // Auto-reflect amount if currently 0
            if (updateData.estado === 'pagado' && pago.monto == 0 && !updateData.monto) {
                if (pago.jugador && pago.jugador.escuela && pago.jugador.escuela.precio_mensualidad) {
                    updateData.monto = parseFloat(pago.jugador.escuela.precio_mensualidad) || 0;
                }
            }

            await pago.update(updateData);

            // Reload with associations
            const pagoActualizado = await Pago.findByPk(pago.id, {
                include: [{
                    model: Jugador,
                    as: 'jugador',
                    attributes: ['id', 'nombre', 'documento', 'foto'],
                    include: [
                        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
                        { model: Escuela, as: 'escuela', attributes: ['id', 'nombre'] }
                    ]
                }]
            });

            res.json({
                success: true,
                data: pagoActualizado,
                message: `Pago ${updateData.estado === 'pagado' ? 'registrado' : 'actualizado'} exitosamente`
            });
        } catch (error) {
            console.error('Error actualizando pago:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /pagos/api/masivo - Actualizar múltiples pagos
    actualizarMasivo: async (req, res) => {
        try {
            const { ids, estado, monto, metodo_pago, fecha_pago } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'Selecciona al menos un pago' });
            }

            // Security: verify all payments belong to user's school
            if (req.user.rol !== 'superadmin' && req.user.escuela_id) {
                const pagosValidos = await Pago.count({
                    where: { id: { [Op.in]: ids } },
                    include: [{
                        model: Jugador,
                        as: 'jugador',
                        where: { escuela_id: req.user.escuela_id },
                        attributes: []
                    }]
                });
                if (pagosValidos !== ids.length) {
                    return res.status(403).json({ success: false, message: 'No tienes permiso para algunos pagos seleccionados' });
                }
            }

            const updateData = {};
            if (estado) updateData.estado = estado;
            if (monto !== undefined) updateData.monto = monto;
            if (metodo_pago) updateData.metodo_pago = metodo_pago;
            if (fecha_pago) updateData.fecha_pago = fecha_pago;

            // If marking as paid and no fecha_pago, use today
            if (estado === 'pagado' && !fecha_pago) {
                updateData.fecha_pago = new Date().toISOString().split('T')[0];
            }

            const pagosToUpdate = await Pago.findAll({
                where: { id: { [Op.in]: ids } },
                include: [{
                    model: Jugador,
                    as: 'jugador',
                    include: [{ model: Escuela, as: 'escuela', attributes: ['precio_mensualidad'] }]
                }]
            });

            for (const pg of pagosToUpdate) {
                let mUpdateData = { ...updateData };
                // Auto-reflect amount if currently 0
                if (mUpdateData.estado === 'pagado' && pg.monto == 0 && monto === undefined) {
                    if (pg.jugador && pg.jugador.escuela && pg.jugador.escuela.precio_mensualidad) {
                        mUpdateData.monto = parseFloat(pg.jugador.escuela.precio_mensualidad) || 0;
                    }
                }
                await pg.update(mUpdateData);
            }

            res.json({
                success: true,
                message: `${ids.length} pago(s) actualizado(s) exitosamente`
            });
        } catch (error) {
            console.error('Error en actualización masiva:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /pagos/api/:id - Eliminar un pago
    eliminar: async (req, res) => {
        try {
            const pago = await Pago.findByPk(req.params.id, {
                include: [{ model: Jugador, as: 'jugador', attributes: ['escuela_id'] }]
            });

            if (!pago) {
                return res.status(404).json({ success: false, message: 'Pago no encontrado' });
            }

            // Security check
            if (req.user.rol !== 'superadmin' && req.user.escuela_id &&
                pago.jugador && pago.jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso' });
            }

            await pago.destroy();
            res.json({ success: true, message: 'Pago eliminado exitosamente' });
        } catch (error) {
            console.error('Error eliminando pago:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /pagos/api/resumen - Resumen/estadísticas de pagos
    resumen: async (req, res) => {
        try {
            const { mes, anio } = req.query;
            const where = {};
            const escuelaFilter = getJugadorEscuelaFilter(req.user);

            if (mes) where.mes = parseInt(mes);
            if (anio) where.anio = parseInt(anio);

            // Build include for school filtering
            const includeForCount = Object.keys(escuelaFilter).length > 0 ? [{
                model: Jugador,
                as: 'jugador',
                attributes: [],
                where: escuelaFilter
            }] : [];

            const totalPagos = await Pago.count({ where, include: includeForCount });
            const pagados = await Pago.count({ where: { ...where, estado: 'pagado' }, include: includeForCount });
            const pendientes = await Pago.count({ where: { ...where, estado: 'pendiente' }, include: includeForCount });

            const montoPagado = await Pago.sum('monto', {
                where: { ...where, estado: 'pagado' },
                include: includeForCount
            }) || 0;

            const montoPendiente = await Pago.sum('monto', {
                where: { ...where, estado: 'pendiente' },
                include: includeForCount
            }) || 0;

            res.json({
                success: true,
                data: {
                    totalPagos,
                    pagados,
                    pendientes,
                    montoPagado: parseFloat(montoPagado),
                    montoPendiente: parseFloat(montoPendiente),
                    montoTotal: parseFloat(montoPagado) + parseFloat(montoPendiente)
                }
            });
        } catch (error) {
            console.error('Error obteniendo resumen:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /pagos/api/jugador/:jugadorId - Historial de pagos de un jugador
    historialJugador: async (req, res) => {
        try {
            // Verify jugador belongs to user's school
            if (req.user.rol !== 'superadmin' && req.user.escuela_id) {
                const jugador = await Jugador.findByPk(req.params.jugadorId, { attributes: ['escuela_id'] });
                if (!jugador || jugador.escuela_id !== req.user.escuela_id) {
                    return res.status(403).json({ success: false, message: 'No tienes permiso' });
                }
            }

            const pagos = await Pago.findAll({
                where: { jugador_id: req.params.jugadorId },
                order: [['anio', 'DESC'], ['mes', 'DESC']]
            });

            res.json({ success: true, data: pagos });
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

module.exports = pagoController;

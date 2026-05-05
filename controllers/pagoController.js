const { db } = require('../db');
const { pagos, jugadores, categorias, escuelas } = require('../db/schema.js');
const { eq, and, desc, asc, inArray, ilike, sql, sum } = require('drizzle-orm');

const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper: Get escuela filter condition for jugador
function getJugadorEscuelaFilter(user) {
    if (user.rol === 'superadmin') return null;
    if (user.escuela_id) return eq(jugadores.escuela_id, user.escuela_id);
    return eq(jugadores.id, -1);
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
            const escuelaFilter = getJugadorEscuelaFilter(req.user);

            let pagosWhere = [];
            if (mes) pagosWhere.push(eq(pagos.mes, parseInt(mes)));
            if (anio) pagosWhere.push(eq(pagos.anio, parseInt(anio)));
            if (estado) pagosWhere.push(eq(pagos.estado, estado));
            if (jugador_id) pagosWhere.push(eq(pagos.jugador_id, parseInt(jugador_id)));

            let jugWhere = [];
            if (escuelaFilter) jugWhere.push(escuelaFilter);
            if (search) jugWhere.push(ilike(jugadores.nombre, `%${search}%`));
            if (categoria_id) jugWhere.push(eq(jugadores.categoria_id, parseInt(categoria_id)));
            if (escuela_id && req.user.rol === 'superadmin') jugWhere.push(eq(jugadores.escuela_id, parseInt(escuela_id)));

            // === Auto-generación de pagos del mes (al listar pagos del mes actual) ===
            const fechaActual = new Date();
            const mesActual = fechaActual.getMonth() + 1;
            const anioActual = fechaActual.getFullYear();
            
            if (parseInt(mes) === mesActual && parseInt(anio) === anioActual) {
                // Find all players for this school
                const listaJugadores = await db.query.jugadores.findMany({
                    where: escuelaFilter ? escuelaFilter : undefined,
                    with: {
                        escuela: { columns: { precio_mensualidad: true } },
                        pagos: {
                            where: and(eq(pagos.mes, mesActual), eq(pagos.anio, anioActual)),
                            columns: { id: true }
                        }
                    }
                });

                const pagosFaltantes = listaJugadores.filter(j => !j.pagos || j.pagos.length === 0);
                if (pagosFaltantes.length > 0) {
                    const nuevosPagos = pagosFaltantes.map(j => ({
                        jugador_id: j.id,
                        mes: mesActual,
                        anio: anioActual,
                        monto: j.escuela && j.escuela.precio_mensualidad ? parseFloat(j.escuela.precio_mensualidad).toFixed(2) : '0.00',
                        estado: 'pendiente'
                    }));
                    await db.insert(pagos).values(nuevosPagos);
                }
            }
            // ==========================================

            const listaPagos = await db.query.pagos.findMany({
                where: pagosWhere.length > 0 ? and(...pagosWhere) : undefined,
                with: {
                    jugador: {
                        columns: { id: true, nombre: true, documento: true, foto: true, categoria_id: true, escuela_id: true },
                        where: jugWhere.length > 0 ? and(...jugWhere) : undefined,
                        with: {
                            categoria: { columns: { id: true, nombre: true } },
                            escuela: { columns: { id: true, nombre: true } }
                        }
                    }
                },
                orderBy: [desc(pagos.anio), desc(pagos.mes), asc(pagos.jugador_id)]
            });

            // Filter out pagos where the joined jugador is null (due to conditions)
            const filteredPagos = listaPagos.filter(p => p.jugador !== null);

            res.json({ success: true, data: filteredPagos });
        } catch (error) {
            console.error('Error listando pagos:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // POST /pagos/api/generar
    generar: async (req, res) => {
        try {
            const { mes, anio, monto } = req.body;

            if (!mes || !anio) {
                return res.status(400).json({ success: false, message: 'Mes y año son requeridos' });
            }

            const escuelaFilter = getJugadorEscuelaFilter(req.user);
            const listaJugadores = await db.query.jugadores.findMany({
                columns: { id: true, escuela_id: true },
                where: escuelaFilter ? escuelaFilter : undefined,
                with: { escuela: { columns: { precio_mensualidad: true } } }
            });

            if (listaJugadores.length === 0) {
                return res.status(400).json({ success: false, message: 'No hay jugadores registrados en tu escuela' });
            }

            let creados = 0;
            let existentes = 0;

            for (const jugador of listaJugadores) {
                let pagoMontoStr = '0.00';
                if(monto) {
                    pagoMontoStr = parseFloat(monto).toFixed(2);
                } else if(jugador.escuela && jugador.escuela.precio_mensualidad) {
                    pagoMontoStr = parseFloat(jugador.escuela.precio_mensualidad).toFixed(2);
                }
                
                const existe = await db.query.pagos.findFirst({
                    where: and(eq(pagos.jugador_id, jugador.id), eq(pagos.mes, parseInt(mes)), eq(pagos.anio, parseInt(anio)))
                });

                if (existe) {
                    existentes++;
                } else {
                    await db.insert(pagos).values({
                        jugador_id: jugador.id,
                        mes: parseInt(mes),
                        anio: parseInt(anio),
                        monto: pagoMontoStr,
                        estado: 'pendiente'
                    });
                    creados++;
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

    // PUT /pagos/api/:id
    actualizar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const pago = await db.query.pagos.findFirst({
                where: eq(pagos.id, id),
                with: { 
                    jugador: { 
                        columns: { escuela_id: true },
                        with: { escuela: { columns: { precio_mensualidad: true } } }
                    }
                }
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

            if (pago.estado === 'pagado' && updateData.estado === 'pendiente') {
                return res.status(400).json({
                    success: false,
                    message: 'Un pago ya confirmado no puede revertirse a pendiente'
                });
            }

            if (updateData.estado === 'pagado' && !updateData.fecha_pago) {
                updateData.fecha_pago = new Date().toISOString().split('T')[0];
            }

            if (updateData.estado === 'pendiente') {
                updateData.fecha_pago = null;
                updateData.metodo_pago = updateData.metodo_pago || null;
            }

            if (updateData.estado === 'pagado' && parseFloat(pago.monto) === 0 && !updateData.monto) {
                if (pago.jugador && pago.jugador.escuela && pago.jugador.escuela.precio_mensualidad) {
                    updateData.monto = parseFloat(pago.jugador.escuela.precio_mensualidad).toFixed(2);
                }
            } else if (updateData.monto !== undefined) {
                 updateData.monto = parseFloat(updateData.monto).toFixed(2);
            }

            await db.update(pagos).set(updateData).where(eq(pagos.id, id));

            const pagoActualizado = await db.query.pagos.findFirst({
                where: eq(pagos.id, id),
                with: {
                    jugador: {
                        columns: { id: true, nombre: true, documento: true, foto: true },
                        with: {
                            categoria: { columns: { id: true, nombre: true } },
                            escuela: { columns: { id: true, nombre: true } }
                        }
                    }
                }
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

    // PUT /pagos/api/masivo
    actualizarMasivo: async (req, res) => {
        try {
            const { ids, estado, monto, metodo_pago, fecha_pago } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'Selecciona al menos un pago' });
            }

            const parsedIds = ids.map(id => parseInt(id));

            // Security check
            if (req.user.rol !== 'superadmin' && req.user.escuela_id) {
                const pagosValidos = await db.query.pagos.findMany({
                    where: inArray(pagos.id, parsedIds),
                    with: { jugador: { columns: { escuela_id: true } } }
                });
                
                const todoValido = pagosValidos.every(p => p.jugador && p.jugador.escuela_id === req.user.escuela_id);
                if (!todoValido || pagosValidos.length !== parsedIds.length) {
                    return res.status(403).json({ success: false, message: 'No tienes permiso para algunos pagos seleccionados' });
                }
            }

            const updateData = {};
            if (estado) updateData.estado = estado;
            if (monto !== undefined) updateData.monto = parseFloat(monto).toFixed(2);
            if (metodo_pago) updateData.metodo_pago = metodo_pago;
            if (fecha_pago) updateData.fecha_pago = new Date(fecha_pago).toISOString().split('T')[0];

            if (estado === 'pagado' && !fecha_pago) {
                updateData.fecha_pago = new Date().toISOString().split('T')[0];
            }
            if (estado === 'pendiente') {
                updateData.fecha_pago = null;
            }

            const pagosToUpdate = await db.query.pagos.findMany({
                where: inArray(pagos.id, parsedIds),
                with: {
                    jugador: { with: { escuela: { columns: { precio_mensualidad: true } } } }
                }
            });

            for (const pg of pagosToUpdate) {
                let mUpdateData = { ...updateData };
                if (mUpdateData.estado === 'pagado' && parseFloat(pg.monto) === 0 && monto === undefined) {
                    if (pg.jugador && pg.jugador.escuela && pg.jugador.escuela.precio_mensualidad) {
                        mUpdateData.monto = parseFloat(pg.jugador.escuela.precio_mensualidad).toFixed(2);
                    }
                }
                await db.update(pagos).set(mUpdateData).where(eq(pagos.id, pg.id));
            }

            res.json({
                success: true,
                message: `${parsedIds.length} pago(s) actualizado(s) exitosamente`
            });
        } catch (error) {
            console.error('Error en actualización masiva:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /pagos/api/:id
    eliminar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const pago = await db.query.pagos.findFirst({
                where: eq(pagos.id, id),
                with: { jugador: { columns: { escuela_id: true } } }
            });

            if (!pago) {
                return res.status(404).json({ success: false, message: 'Pago no encontrado' });
            }

            // Security check
            if (req.user.rol !== 'superadmin' && req.user.escuela_id &&
                pago.jugador && pago.jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso' });
            }

            await db.delete(pagos).where(eq(pagos.id, id));
            res.json({ success: true, message: 'Pago eliminado exitosamente' });
        } catch (error) {
            console.error('Error eliminando pago:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /pagos/api/resumen
    resumen: async (req, res) => {
        try {
            const { mes, anio } = req.query;
            const escuelaFilter = getJugadorEscuelaFilter(req.user);

            let pagosWhere = [];
            if (mes) pagosWhere.push(eq(pagos.mes, parseInt(mes)));
            if (anio) pagosWhere.push(eq(pagos.anio, parseInt(anio)));

            let jugWhere = [];
            if (escuelaFilter) jugWhere.push(escuelaFilter);

            const allPagos = await db.query.pagos.findMany({
                where: pagosWhere.length > 0 ? and(...pagosWhere) : undefined,
                with: {
                    jugador: {
                        columns: { id: true, escuela_id: true },
                        where: jugWhere.length > 0 ? and(...jugWhere) : undefined
                    }
                }
            });

            // Filtrar solo los pagos cuyos jugadores pasaron el filtro (no son null)
            const filteredPagos = allPagos.filter(p => p.jugador !== null);

            let totalPagos = filteredPagos.length;
            let pagados = 0;
            let pendientes = 0;
            let montoPagado = 0;
            let montoPendiente = 0;

            for(const p of filteredPagos) {
                if(p.estado === 'pagado') {
                    pagados++;
                    montoPagado += parseFloat(p.monto);
                } else {
                    pendientes++;
                    montoPendiente += parseFloat(p.monto);
                }
            }

            res.json({
                success: true,
                data: {
                    totalPagos,
                    pagados,
                    pendientes,
                    montoPagado: montoPagado,
                    montoPendiente: montoPendiente,
                    montoTotal: montoPagado + montoPendiente
                }
            });
        } catch (error) {
            console.error('Error obteniendo resumen:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /pagos/api/jugador/:jugadorId
    historialJugador: async (req, res) => {
        try {
            const jugadorId = parseInt(req.params.jugadorId);
            
            // Verify jugador belongs to user's school
            if (req.user.rol !== 'superadmin' && req.user.escuela_id) {
                const jugador = await db.query.jugadores.findFirst({
                    where: eq(jugadores.id, jugadorId),
                    columns: { escuela_id: true }
                });
                if (!jugador || jugador.escuela_id !== req.user.escuela_id) {
                    return res.status(403).json({ success: false, message: 'No tienes permiso' });
                }
            }

            const historialPagos = await db.query.pagos.findMany({
                where: eq(pagos.jugador_id, jugadorId),
                orderBy: [desc(pagos.anio), desc(pagos.mes)]
            });

            res.json({ success: true, data: historialPagos });
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

module.exports = pagoController;

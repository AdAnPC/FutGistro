const { db } = require('../db');
const { pagos, jugadores } = require('../db/schema.js');
const { eq, and, desc, asc, inArray, ilike } = require('drizzle-orm');

const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const pagoService = {
    getJugadorEscuelaFilter: (user) => {
        if (user.rol === 'superadmin') return null;
        if (user.escuela_id) return eq(jugadores.escuela_id, user.escuela_id);
        return eq(jugadores.id, -1);
    },

    listPayments: async (query, user) => {
        const { mes, anio, estado, jugador_id, categoria_id, escuela_id, search } = query;
        const escuelaFilter = pagoService.getJugadorEscuelaFilter(user);

        let pagosWhere = [];
        if (mes) pagosWhere.push(eq(pagos.mes, parseInt(mes)));
        if (anio) pagosWhere.push(eq(pagos.anio, parseInt(anio)));
        if (estado) pagosWhere.push(eq(pagos.estado, estado));
        if (jugador_id) pagosWhere.push(eq(pagos.jugador_id, parseInt(jugador_id)));

        let jugWhere = [];
        if (escuelaFilter) jugWhere.push(escuelaFilter);
        if (search) jugWhere.push(ilike(jugadores.nombre, `%${search}%`));
        if (categoria_id) jugWhere.push(eq(jugadores.categoria_id, parseInt(categoria_id)));
        if (escuela_id && user.rol === 'superadmin') jugWhere.push(eq(jugadores.escuela_id, parseInt(escuela_id)));

        // Auto-generation logic for current month
        const fechaActual = new Date();
        const mesActual = fechaActual.getMonth() + 1;
        const anioActual = fechaActual.getFullYear();
        
        if (parseInt(mes) === mesActual && parseInt(anio) === anioActual) {
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

        return listaPagos.filter(p => p.jugador !== null);
    },

    generatePayments: async (data, user) => {
        const { mes, anio, monto } = data;
        const escuelaFilter = pagoService.getJugadorEscuelaFilter(user);

        const listaJugadores = await db.query.jugadores.findMany({
            columns: { id: true, escuela_id: true },
            where: escuelaFilter ? escuelaFilter : undefined,
            with: { escuela: { columns: { precio_mensualidad: true } } }
        });

        if (listaJugadores.length === 0) {
            const err = new Error('No hay jugadores registrados en tu escuela');
            err.statusCode = 400;
            throw err;
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

        return {
            message: `Se generaron ${creados} pagos para ${MESES[parseInt(mes)]} ${anio}. ${existentes} ya existían.`,
            data: { creados, existentes }
        };
    },

    updatePayment: async (id, data, user) => {
        const pago = await db.query.pagos.findFirst({
            where: eq(pagos.id, id),
            with: { 
                jugador: { 
                    columns: { escuela_id: true },
                    with: { escuela: { columns: { precio_mensualidad: true } } }
                }
            }
        });

        if (!pago) return null;

        if (user.rol !== 'superadmin' && user.escuela_id &&
            pago.jugador && pago.jugador.escuela_id !== user.escuela_id) {
            const err = new Error('Unauthorized');
            err.statusCode = 403;
            throw err;
        }

        const updateData = { ...data };

        if (pago.estado === 'pagado' && updateData.estado === 'pendiente') {
            const err = new Error('Un pago ya confirmado no puede revertirse a pendiente');
            err.statusCode = 400;
            throw err;
        }

        if (updateData.estado === 'pagado' && !updateData.fecha_pago) {
            updateData.fecha_pago = new Date().toISOString().split('T')[0];
        }

        if (updateData.estado === 'pendiente') {
            updateData.fecha_pago = null;
        }

        if (updateData.estado === 'pagado' && parseFloat(pago.monto) === 0 && !updateData.monto) {
            if (pago.jugador && pago.jugador.escuela && pago.jugador.escuela.precio_mensualidad) {
                updateData.monto = parseFloat(pago.jugador.escuela.precio_mensualidad).toFixed(2);
            }
        } else if (updateData.monto !== undefined) {
             updateData.monto = parseFloat(updateData.monto).toFixed(2);
        }

        await db.update(pagos).set(updateData).where(eq(pagos.id, id));

        return await db.query.pagos.findFirst({
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
    },

    bulkUpdatePayments: async (data, user) => {
        const { ids, estado, monto, metodo_pago, fecha_pago } = data;
        const parsedIds = ids.map(id => parseInt(id));

        if (user.rol !== 'superadmin' && user.escuela_id) {
            const pagosValidos = await db.query.pagos.findMany({
                where: inArray(pagos.id, parsedIds),
                with: { jugador: { columns: { escuela_id: true } } }
            });
            
            const todoValido = pagosValidos.every(p => p.jugador && p.jugador.escuela_id === user.escuela_id);
            if (!todoValido || pagosValidos.length !== parsedIds.length) {
                const err = new Error('No tienes permiso para algunos pagos seleccionados');
                err.statusCode = 403;
                throw err;
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

        return true;
    },

    deletePayment: async (id, user) => {
        const pago = await db.query.pagos.findFirst({
            where: eq(pagos.id, id),
            with: { jugador: { columns: { escuela_id: true } } }
        });

        if (!pago) return null;

        if (user.rol !== 'superadmin' && user.escuela_id &&
            pago.jugador && pago.jugador.escuela_id !== user.escuela_id) {
            const err = new Error('Unauthorized');
            err.statusCode = 403;
            throw err;
        }

        await db.delete(pagos).where(eq(pagos.id, id));
        return true;
    },

    getSummary: async (query, user) => {
        const { mes, anio } = query;
        const escuelaFilter = pagoService.getJugadorEscuelaFilter(user);

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

        const filteredPagos = allPagos.filter(p => p.jugador !== null);

        let pagados = 0;
        let pendientes = 0;
        let montoPagado = 0;
        let montoPendiente = 0;

        for(const p of filteredPagos) {
            const m = parseFloat(p.monto);
            if(p.estado === 'pagado') {
                pagados++;
                montoPagado += m;
            } else {
                pendientes++;
                montoPendiente += m;
            }
        }

        return {
            totalPagos: filteredPagos.length,
            pagados,
            pendientes,
            montoPagado,
            montoPendiente,
            montoTotal: montoPagado + montoPendiente
        };
    },

    getPlayerHistory: async (jugadorId, user) => {
        if (user.rol !== 'superadmin' && user.escuela_id) {
            const jugador = await db.query.jugadores.findFirst({
                where: eq(jugadores.id, jugadorId),
                columns: { escuela_id: true }
            });
            if (!jugador || jugador.escuela_id !== user.escuela_id) {
                const err = new Error('Unauthorized');
                err.statusCode = 403;
                throw err;
            }
        }

        return await db.query.pagos.findMany({
            where: eq(pagos.jugador_id, jugadorId),
            orderBy: [desc(pagos.anio), desc(pagos.mes)]
        });
    }
};

module.exports = pagoService;

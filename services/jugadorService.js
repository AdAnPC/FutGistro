const { db } = require('../db');
const { jugadores, categorias, asistencias, escuelas, pagos } = require('../db/schema.js');
const { eq, and, ilike, count, asc } = require('drizzle-orm');
const fileService = require('./fileService');

const jugadorService = {
    getEdad: (fechaNacimiento) => {
        if (!fechaNacimiento) return null;
        const today = new Date();
        const birthDate = new Date(fechaNacimiento);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    },

    getEscuelaFilter: (user) => {
        if (user.rol === 'superadmin') return null;
        if (user.escuela_id) return eq(jugadores.escuela_id, user.escuela_id);
        return eq(jugadores.id, -1);
    },

    listPlayers: async (query, user) => {
        const { search, categoria_id, page = 1, limit = 20 } = query;
        const escuelaFilter = jugadorService.getEscuelaFilter(user);
        
        let jugWhere = [];
        if (escuelaFilter) jugWhere.push(escuelaFilter);
        if (search) jugWhere.push(ilike(jugadores.nombre, `%${search}%`));
        if (categoria_id) jugWhere.push(eq(jugadores.categoria_id, parseInt(categoria_id)));

        // Monthly payment check logic
        if (!search) {
            const fechaActual = new Date();
            const mesActual = fechaActual.getMonth() + 1;
            const anioActual = fechaActual.getFullYear();
            
            const jugadoresSinPago = await db.query.jugadores.findMany({
                where: escuelaFilter ? escuelaFilter : undefined,
                with: {
                    escuela: { columns: { precio_mensualidad: true } },
                    pagos: {
                        where: and(eq(pagos.mes, mesActual), eq(pagos.anio, anioActual)),
                        columns: { id: true }
                    }
                }
            });

            const pagosFaltantes = jugadoresSinPago.filter(j => !j.pagos || j.pagos.length === 0);
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

        const limitVal = parseInt(limit);
        const offsetVal = (parseInt(page) - 1) * limitVal;

        const fechaActualListar = new Date();
        const mesActualListar = fechaActualListar.getMonth() + 1;
        const anioActualListar = fechaActualListar.getFullYear();

        const countResult = await db.select({ count: count() })
            .from(jugadores)
            .where(jugWhere.length > 0 ? and(...jugWhere) : undefined);
        
        const total = countResult[0].count;

        const listaJugadores = await db.query.jugadores.findMany({
            where: jugWhere.length > 0 ? and(...jugWhere) : undefined,
            with: {
                categoria: { columns: { id: true, nombre: true } },
                escuela: { columns: { id: true, nombre: true } },
                pagos: {
                    where: and(eq(pagos.mes, mesActualListar), eq(pagos.anio, anioActualListar))
                }
            },
            orderBy: [asc(jugadores.nombre)],
            limit: limitVal,
            offset: offsetVal
        });

        const data = listaJugadores.map(j => ({
            ...j,
            edad: jugadorService.getEdad(j.fecha_nacimiento)
        }));

        return {
            data,
            total,
            paginas: Math.ceil(total / limitVal),
            pagina_actual: parseInt(page)
        };
    },

    getPlayerById: async (id, user) => {
        const jugador = await db.query.jugadores.findFirst({
            where: eq(jugadores.id, id),
            with: {
                categoria: { columns: { id: true, nombre: true } },
                escuela: { columns: { id: true, nombre: true, logo: true } }
            }
        });

        if (!jugador) return null;

        if (user.rol !== 'superadmin' && user.escuela_id && jugador.escuela_id !== user.escuela_id) {
            throw new Error('Unauthorized');
        }

        return { ...jugador, edad: jugadorService.getEdad(jugador.fecha_nacimiento) };
    },

    createPlayer: async (data, user, files) => {
        const jugadorData = { ...data };

        if (user.rol !== 'superadmin' && user.escuela_id) {
            jugadorData.escuela_id = user.escuela_id;
        }

        // Handle file URLs from temp upload
        const urlFields = ['foto', 'registro_civil', 'documento_acudiente', 'documento_extra1', 'documento_extra2', 'documento_extra3', 'documento_extra4'];
        urlFields.forEach(field => {
            if (data[`${field}_url`]) {
                jugadorData[field] = data[`${field}_url`];
                delete jugadorData[`${field}_url`];
            }
        });

        // Handle direct file uploads
        if (files) {
            if (files.foto) jugadorData.foto = '/uploads/fotos/' + files.foto[0].filename;
            const docs = ['registro_civil', 'documento_acudiente', 'documento_extra1', 'documento_extra2', 'documento_extra3', 'documento_extra4'];
            docs.forEach(doc => {
                if (files[doc]) jugadorData[doc] = '/uploads/documentos/' + files[doc][0].filename;
            });
        }

        // Handle signatures
        if (data.firma_base64) {
            jugadorData.firma_padre = await fileService.saveSignature(data.firma_base64);
            delete jugadorData.firma_base64;
        }
        if (data.firma_entrenador_base64) {
            jugadorData.firma_entrenador = await fileService.saveSignature(data.firma_entrenador_base64);
            delete jugadorData.firma_entrenador_base64;
        }

        // Format dates
        if (!jugadorData.fecha_registro) {
            jugadorData.fecha_registro = new Date().toISOString().split('T')[0];
        } else {
            jugadorData.fecha_registro = new Date(jugadorData.fecha_registro).toISOString().split('T')[0];
        }
        if (jugadorData.fecha_nacimiento) {
            jugadorData.fecha_nacimiento = new Date(jugadorData.fecha_nacimiento).toISOString().split('T')[0];
        }

        if(jugadorData.categoria_id) jugadorData.categoria_id = parseInt(jugadorData.categoria_id);
        if(jugadorData.escuela_id) jugadorData.escuela_id = parseInt(jugadorData.escuela_id);

        const existe = await db.query.jugadores.findFirst({ where: eq(jugadores.documento, jugadorData.documento) });
        if (existe) {
            const err = new Error('Ya existe un jugador con este documento');
            err.statusCode = 400;
            throw err;
        }

        const insertResult = await db.insert(jugadores).values(jugadorData).returning();
        const jugador = insertResult[0];

        // Create initial payment
        const fechaActual = new Date();
        let montoDefault = '0.00';
        if (jugador.escuela_id) {
            const esc = await db.query.escuelas.findFirst({ where: eq(escuelas.id, jugador.escuela_id) });
            if (esc && esc.precio_mensualidad) {
                montoDefault = parseFloat(esc.precio_mensualidad).toFixed(2);
            }
        }

        await db.insert(pagos).values({
            jugador_id: jugador.id,
            mes: fechaActual.getMonth() + 1,
            anio: fechaActual.getFullYear(),
            monto: montoDefault,
            estado: 'pendiente'
        });

        return jugador;
    },

    updatePlayer: async (id, data, user, files) => {
        const jugador = await db.query.jugadores.findFirst({ where: eq(jugadores.id, id) });
        if (!jugador) return null;

        if (user.rol !== 'superadmin' && user.escuela_id && jugador.escuela_id !== user.escuela_id) {
            throw new Error('Unauthorized');
        }

        const jugadorData = { ...data };
        if (user.rol !== 'superadmin') {
            delete jugadorData.escuela_id;
        }

        if(jugadorData.documento && jugadorData.documento !== jugador.documento) {
            const existe = await db.query.jugadores.findFirst({ where: eq(jugadores.documento, jugadorData.documento) });
            if(existe) {
                const err = new Error('Ya existe un jugador con este documento');
                err.statusCode = 400;
                throw err;
            }
        }

        // Handle file updates
        const fields = ['foto', 'registro_civil', 'documento_acudiente', 'documento_extra1', 'documento_extra2', 'documento_extra3', 'documento_extra4'];
        fields.forEach(field => {
            const urlKey = `${field}_url`;
            if (data[urlKey] && data[urlKey] !== jugador[field]) {
                fileService.deleteFile(jugador[field]);
                jugadorData[field] = data[urlKey];
                delete jugadorData[urlKey];
            }
        });

        if (files) {
            if (files.foto) { 
                fileService.deleteFile(jugador.foto); 
                jugadorData.foto = '/uploads/fotos/' + files.foto[0].filename; 
            }
            const docs = ['registro_civil', 'documento_acudiente', 'documento_extra1', 'documento_extra2', 'documento_extra3', 'documento_extra4'];
            docs.forEach(doc => {
                if (files[doc]) {
                    fileService.deleteFile(jugador[doc]);
                    jugadorData[doc] = '/uploads/documentos/' + files[doc][0].filename;
                }
            });
        }

        if (data.firma_base64) {
            fileService.deleteFile(jugador.firma_padre);
            jugadorData.firma_padre = await fileService.saveSignature(data.firma_base64);
            delete jugadorData.firma_base64;
        }
        if (data.firma_entrenador_base64) {
            fileService.deleteFile(jugador.firma_entrenador);
            jugadorData.firma_entrenador = await fileService.saveSignature(data.firma_entrenador_base64);
            delete jugadorData.firma_entrenador_base64;
        }

        if (jugadorData.fecha_registro) jugadorData.fecha_registro = new Date(jugadorData.fecha_registro).toISOString().split('T')[0];
        if (jugadorData.fecha_nacimiento) jugadorData.fecha_nacimiento = new Date(jugadorData.fecha_nacimiento).toISOString().split('T')[0];
        if (jugadorData.categoria_id) jugadorData.categoria_id = parseInt(jugadorData.categoria_id);
        if (jugadorData.escuela_id) jugadorData.escuela_id = parseInt(jugadorData.escuela_id);

        const updateResult = await db.update(jugadores).set(jugadorData).where(eq(jugadores.id, id)).returning();
        return updateResult[0];
    },

    deletePlayer: async (id, user) => {
        const jugador = await db.query.jugadores.findFirst({ where: eq(jugadores.id, id) });
        if (!jugador) return null;

        if (user.rol !== 'superadmin' && user.escuela_id && jugador.escuela_id !== user.escuela_id) {
            throw new Error('Unauthorized');
        }

        const files = ['foto', 'registro_civil', 'documento_acudiente', 'documento_extra1', 'documento_extra2', 'documento_extra3', 'documento_extra4', 'firma_padre', 'firma_entrenador'];
        files.forEach(f => fileService.deleteFile(jugador[f]));

        await db.delete(jugadores).where(eq(jugadores.id, id));
        return true;
    },

    getStats: async (user) => {
        const escuelaFilter = jugadorService.getEscuelaFilter(user);

        const countResult = await db.select({ count: count() })
            .from(jugadores)
            .where(escuelaFilter ? escuelaFilter : undefined);
        const totalJugadores = countResult[0].count;

        const listaCategorias = await db.query.categorias.findMany({
            with: {
                jugadores: {
                    where: escuelaFilter ? escuelaFilter : undefined,
                    columns: { id: true }
                }
            }
        });

        const listaEscuelas = await db.query.escuelas.findMany({
            with: {
                jugadores: {
                    where: escuelaFilter ? escuelaFilter : undefined,
                    columns: { id: true }
                }
            }
        });

        const porCategoria = listaCategorias.map(cat => ({
            nombre: cat.nombre,
            total: cat.jugadores ? cat.jugadores.length : 0
        }));

        const porEscuela = listaEscuelas.map(esc => ({
            nombre: esc.nombre,
            total: esc.jugadores ? esc.jugadores.length : 0
        }));

        const totalEscuelas = user.rol === 'superadmin' ? listaEscuelas.length : 1;

        return { totalJugadores, porCategoria, porEscuela, totalEscuelas };
    }
};

module.exports = jugadorService;

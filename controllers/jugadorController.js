const { db } = require('../db');
const { jugadores, categorias, asistencias, escuelas, pagos } = require('../db/schema.js');
const { eq, and, desc, asc, ilike, count } = require('drizzle-orm');
const path = require('path');
const fs = require('fs');

// Helper: Get escuela filter condition based on user role
function getEscuelaFilter(user) {
    if (user.rol === 'superadmin') return null;
    if (user.escuela_id) return eq(jugadores.escuela_id, user.escuela_id);
    return eq(jugadores.id, -1);
}

function getEdad(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const jugadorController = {
    // GET /jugadores/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/jugadores' });
    },

    // GET /jugadores/nuevo
    nuevoPage: (req, res) => {
        res.sendFile('formulario.html', { root: './views/jugadores' });
    },

    // GET /jugadores/editar/:id
    editarPage: (req, res) => {
        res.sendFile('formulario.html', { root: './views/jugadores' });
    },

    // GET /jugadores/ficha/:id
    fichaPage: (req, res) => {
        res.sendFile('ficha.html', { root: './views/jugadores' });
    },

    // GET /api/jugadores
    listar: async (req, res) => {
        try {
            const { search, categoria_id, page = 1, limit = 20 } = req.query;
            const escuelaFilter = getEscuelaFilter(req.user);
            
            let jugWhere = [];
            if (escuelaFilter) jugWhere.push(escuelaFilter);
            if (search) jugWhere.push(ilike(jugadores.nombre, `%${search}%`));
            if (categoria_id) jugWhere.push(eq(jugadores.categoria_id, parseInt(categoria_id)));

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

            // Count query
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

            const jugadoresConEdad = listaJugadores.map(j => ({
                ...j,
                edad: getEdad(j.fecha_nacimiento)
            }));

            res.json({
                success: true,
                data: jugadoresConEdad,
                total: total,
                paginas: Math.ceil(total / limitVal),
                pagina_actual: parseInt(page)
            });
        } catch (error) {
            console.error('❌ Error listando jugadores:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /api/jugadores/:id
    obtener: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const jugador = await db.query.jugadores.findFirst({
                where: eq(jugadores.id, id),
                with: {
                    categoria: { columns: { id: true, nombre: true } },
                    escuela: { columns: { id: true, nombre: true, logo: true } }
                }
            });

            if (!jugador) {
                return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
            }

            if (req.user.rol !== 'superadmin' && req.user.escuela_id && jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para ver este jugador' });
            }

            const data = { ...jugador, edad: getEdad(jugador.fecha_nacimiento) };

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error obteniendo jugador:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // POST /api/upload-temp
    uploadTemp: async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
            }
            const file = req.files[0];
            let folder = 'documentos';
            if (file.fieldname === 'foto') folder = 'fotos';
            else if (file.fieldname === 'logo') folder = 'logos';
            else if (file.fieldname === 'firma_padre' || file.fieldname === 'firma_entrenador') folder = 'firmas';

            const filePath = `/uploads/${folder}/${file.filename}`;
            res.json({ success: true, url: filePath, fieldname: file.fieldname });
        } catch (error) {
            console.error('Error subiendo archivo temporal:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor al subir archivo' });
        }
    },

    // POST /api/jugadores
    crear: async (req, res) => {
        try {
            const jugadorData = { ...req.body };

            if (req.user.rol !== 'superadmin' && req.user.escuela_id) {
                jugadorData.escuela_id = req.user.escuela_id;
            }

            if (req.body.foto_url) jugadorData.foto = req.body.foto_url;
            if (req.body.registro_civil_url) jugadorData.registro_civil = req.body.registro_civil_url;
            if (req.body.documento_acudiente_url) jugadorData.documento_acudiente = req.body.documento_acudiente_url;
            if (req.body.documento_extra1_url) jugadorData.documento_extra1 = req.body.documento_extra1_url;
            if (req.body.documento_extra2_url) jugadorData.documento_extra2 = req.body.documento_extra2_url;
            if (req.body.documento_extra3_url) jugadorData.documento_extra3 = req.body.documento_extra3_url;
            if (req.body.documento_extra4_url) jugadorData.documento_extra4 = req.body.documento_extra4_url;

            if (req.files) {
                if (req.files.foto) jugadorData.foto = '/uploads/fotos/' + req.files.foto[0].filename;
                if (req.files.registro_civil) jugadorData.registro_civil = '/uploads/documentos/' + req.files.registro_civil[0].filename;
                if (req.files.documento_acudiente) jugadorData.documento_acudiente = '/uploads/documentos/' + req.files.documento_acudiente[0].filename;
                if (req.files.documento_extra1) jugadorData.documento_extra1 = '/uploads/documentos/' + req.files.documento_extra1[0].filename;
                if (req.files.documento_extra2) jugadorData.documento_extra2 = '/uploads/documentos/' + req.files.documento_extra2[0].filename;
                if (req.files.documento_extra3) jugadorData.documento_extra3 = '/uploads/documentos/' + req.files.documento_extra3[0].filename;
                if (req.files.documento_extra4) jugadorData.documento_extra4 = '/uploads/documentos/' + req.files.documento_extra4[0].filename;
            }

            if (req.body.firma_base64) {
                const firmaPath = await guardarFirma(req.body.firma_base64);
                jugadorData.firma_padre = firmaPath;
                delete jugadorData.firma_base64;
            }
            if (req.body.firma_entrenador_base64) {
                const firmaPathEntrenador = await guardarFirma(req.body.firma_entrenador_base64);
                jugadorData.firma_entrenador = firmaPathEntrenador;
                delete jugadorData.firma_entrenador_base64;
            }

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
                return res.status(400).json({ success: false, message: 'Ya existe un jugador con este documento' });
            }

            const insertResult = await db.insert(jugadores).values(jugadorData).returning();
            const jugador = insertResult[0];

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

            res.status(201).json({ success: true, data: jugador, message: 'Jugador registrado exitosamente' });
        } catch (error) {
            console.error('Error creando jugador:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /api/jugadores/:id
    actualizar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const jugador = await db.query.jugadores.findFirst({ where: eq(jugadores.id, id) });

            if (!jugador) {
                return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
            }

            if (req.user.rol !== 'superadmin' && req.user.escuela_id && jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para editar este jugador' });
            }

            const jugadorData = { ...req.body };
            if (req.user.rol !== 'superadmin') {
                delete jugadorData.escuela_id;
            }

            if(jugadorData.documento && jugadorData.documento !== jugador.documento) {
                const existe = await db.query.jugadores.findFirst({ where: eq(jugadores.documento, jugadorData.documento) });
                if(existe) return res.status(400).json({ success: false, message: 'Ya existe un jugador con este documento' });
            }

            if (req.body.foto_url && req.body.foto_url !== jugador.foto) {
                eliminarArchivo(jugador.foto);
                jugadorData.foto = req.body.foto_url;
            }
            if (req.body.registro_civil_url && req.body.registro_civil_url !== jugador.registro_civil) {
                eliminarArchivo(jugador.registro_civil);
                jugadorData.registro_civil = req.body.registro_civil_url;
            }
            if (req.body.documento_acudiente_url && req.body.documento_acudiente_url !== jugador.documento_acudiente) {
                eliminarArchivo(jugador.documento_acudiente);
                jugadorData.documento_acudiente = req.body.documento_acudiente_url;
            }
            if (req.body.documento_extra1_url && req.body.documento_extra1_url !== jugador.documento_extra1) {
                eliminarArchivo(jugador.documento_extra1);
                jugadorData.documento_extra1 = req.body.documento_extra1_url;
            }
            if (req.body.documento_extra2_url && req.body.documento_extra2_url !== jugador.documento_extra2) {
                eliminarArchivo(jugador.documento_extra2);
                jugadorData.documento_extra2 = req.body.documento_extra2_url;
            }
            if (req.body.documento_extra3_url && req.body.documento_extra3_url !== jugador.documento_extra3) {
                eliminarArchivo(jugador.documento_extra3);
                jugadorData.documento_extra3 = req.body.documento_extra3_url;
            }
            if (req.body.documento_extra4_url && req.body.documento_extra4_url !== jugador.documento_extra4) {
                eliminarArchivo(jugador.documento_extra4);
                jugadorData.documento_extra4 = req.body.documento_extra4_url;
            }

            if (req.files) {
                if (req.files.foto) { eliminarArchivo(jugador.foto); jugadorData.foto = '/uploads/fotos/' + req.files.foto[0].filename; }
                if (req.files.registro_civil) { eliminarArchivo(jugador.registro_civil); jugadorData.registro_civil = '/uploads/documentos/' + req.files.registro_civil[0].filename; }
                if (req.files.documento_acudiente) { eliminarArchivo(jugador.documento_acudiente); jugadorData.documento_acudiente = '/uploads/documentos/' + req.files.documento_acudiente[0].filename; }
                if (req.files.documento_extra1) { eliminarArchivo(jugador.documento_extra1); jugadorData.documento_extra1 = '/uploads/documentos/' + req.files.documento_extra1[0].filename; }
                if (req.files.documento_extra2) { eliminarArchivo(jugador.documento_extra2); jugadorData.documento_extra2 = '/uploads/documentos/' + req.files.documento_extra2[0].filename; }
                if (req.files.documento_extra3) { eliminarArchivo(jugador.documento_extra3); jugadorData.documento_extra3 = '/uploads/documentos/' + req.files.documento_extra3[0].filename; }
                if (req.files.documento_extra4) { eliminarArchivo(jugador.documento_extra4); jugadorData.documento_extra4 = '/uploads/documentos/' + req.files.documento_extra4[0].filename; }
            }

            if (req.body.firma_base64) {
                eliminarArchivo(jugador.firma_padre);
                const firmaPath = await guardarFirma(req.body.firma_base64);
                jugadorData.firma_padre = firmaPath;
                delete jugadorData.firma_base64;
            }
            if (req.body.firma_entrenador_base64) {
                eliminarArchivo(jugador.firma_entrenador);
                const firmaPathEntrenador = await guardarFirma(req.body.firma_entrenador_base64);
                jugadorData.firma_entrenador = firmaPathEntrenador;
                delete jugadorData.firma_entrenador_base64;
            }

            if (jugadorData.fecha_registro) jugadorData.fecha_registro = new Date(jugadorData.fecha_registro).toISOString().split('T')[0];
            if (jugadorData.fecha_nacimiento) jugadorData.fecha_nacimiento = new Date(jugadorData.fecha_nacimiento).toISOString().split('T')[0];
            if (jugadorData.categoria_id) jugadorData.categoria_id = parseInt(jugadorData.categoria_id);
            if (jugadorData.escuela_id) jugadorData.escuela_id = parseInt(jugadorData.escuela_id);

            const updateResult = await db.update(jugadores).set(jugadorData).where(eq(jugadores.id, id)).returning();
            res.json({ success: true, data: updateResult[0], message: 'Jugador actualizado exitosamente' });
        } catch (error) {
            console.error('Error actualizando jugador:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /api/jugadores/:id
    eliminar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const jugador = await db.query.jugadores.findFirst({ where: eq(jugadores.id, id) });

            if (!jugador) {
                return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
            }

            if (req.user.rol !== 'superadmin' && req.user.escuela_id && jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este jugador' });
            }

            eliminarArchivo(jugador.foto);
            eliminarArchivo(jugador.registro_civil);
            eliminarArchivo(jugador.documento_acudiente);
            eliminarArchivo(jugador.documento_extra1);
            eliminarArchivo(jugador.documento_extra2);
            eliminarArchivo(jugador.documento_extra3);
            eliminarArchivo(jugador.documento_extra4);
            eliminarArchivo(jugador.firma_padre);
            eliminarArchivo(jugador.firma_entrenador);

            await db.delete(jugadores).where(eq(jugadores.id, id));
            res.json({ success: true, message: 'Jugador eliminado exitosamente' });
        } catch (error) {
            console.error('Error eliminando jugador:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /api/jugadores/estadisticas
    estadisticas: async (req, res) => {
        try {
            const escuelaFilter = getEscuelaFilter(req.user);

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

            const totalEscuelas = req.user.rol === 'superadmin' ? listaEscuelas.length : 1;

            res.json({
                success: true,
                data: { totalJugadores, porCategoria, porEscuela, totalEscuelas }
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

// Helper: Save signature from base64
async function guardarFirma(base64Data) {
    const matches = base64Data.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) throw new Error('Formato de firma inválido');

    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    const filename = `firma-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
    const filepath = path.join(__dirname, '..', 'public', 'uploads', 'firmas', filename);

    fs.writeFileSync(filepath, buffer);
    return '/uploads/firmas/' + filename;
}

// Helper: Delete file from disk
function eliminarArchivo(filePath) {
    if (!filePath) return;
    const fullPath = path.join(__dirname, '..', 'public', filePath);
    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
        } catch (e) {
            console.error('Error eliminando archivo:', e);
        }
    }
}

module.exports = jugadorController;

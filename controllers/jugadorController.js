const { Jugador, Categoria, Asistencia, Escuela, Pago } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Helper: Get escuela filter condition based on user role
function getEscuelaFilter(user) {
    // Superadmin can see all schools
    if (user.rol === 'superadmin') return {};
    // Users with school assigned - only their school's data
    if (user.escuela_id) return { escuela_id: user.escuela_id };
    // User without school - show nothing (must select school first)
    return { id: -1 };
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
            const where = { ...escuelaFilter };
            if (!search) {
                const fechaActual = new Date();
                const mesActual = fechaActual.getMonth() + 1;
                const anioActual = fechaActual.getFullYear();
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
                where.nombre = { [Op.like]: `%${search}%` };
            }

            if (categoria_id) {
                where.categoria_id = categoria_id;
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const fechaActualListar = new Date();
            const mesActualListar = fechaActualListar.getMonth() + 1;
            const anioActualListar = fechaActualListar.getFullYear();

            const { count, rows } = await Jugador.findAndCountAll({
                where,
                include: [{
                    model: Categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre']
                }, {
                    model: Escuela,
                    as: 'escuela',
                    attributes: ['id', 'nombre']
                }, {
                    model: Pago,
                    as: 'pagos',
                    where: {
                        mes: mesActualListar,
                        anio: anioActualListar
                    },
                    required: false
                }],
                order: [['nombre', 'ASC']],
                limit: parseInt(limit),
                offset
            });

            const jugadores = rows.map(j => {
                const data = j.toJSON();
                data.edad = j.getEdad();
                return data;
            });

            res.json({
                success: true,
                data: jugadores,
                total: count,
                paginas: Math.ceil(count / parseInt(limit)),
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
            const jugador = await Jugador.findByPk(req.params.id, {
                include: [{
                    model: Categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre']
                }, {
                    model: Escuela,
                    as: 'escuela',
                    attributes: ['id', 'nombre', 'logo']
                }]
            });

            if (!jugador) {
                return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
            }

            // Security: Verify the player belongs to the user's school
            if (req.user.rol !== 'superadmin' && req.user.escuela_id && jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para ver este jugador' });
            }

            const data = jugador.toJSON();
            data.edad = jugador.getEdad();

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error obteniendo jugador:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // POST /api/jugadores
    crear: async (req, res) => {
        try {
            const jugadorData = { ...req.body };

            // Auto-assign escuela_id from the logged-in user (if not superadmin)
            if (req.user.rol !== 'superadmin' && req.user.escuela_id) {
                jugadorData.escuela_id = req.user.escuela_id;
            }

            // Handle uploaded files (max 5)
            if (req.files) {
                if (req.files.foto) jugadorData.foto = '/uploads/fotos/' + req.files.foto[0].filename;
                if (req.files.registro_civil) jugadorData.registro_civil = '/uploads/documentos/' + req.files.registro_civil[0].filename;
                if (req.files.documento_acudiente) jugadorData.documento_acudiente = '/uploads/documentos/' + req.files.documento_acudiente[0].filename;
                if (req.files.documento_extra1) jugadorData.documento_extra1 = '/uploads/documentos/' + req.files.documento_extra1[0].filename;
                if (req.files.documento_extra2) jugadorData.documento_extra2 = '/uploads/documentos/' + req.files.documento_extra2[0].filename;
                if (req.files.documento_extra3) jugadorData.documento_extra3 = '/uploads/documentos/' + req.files.documento_extra3[0].filename;
                if (req.files.documento_extra4) jugadorData.documento_extra4 = '/uploads/documentos/' + req.files.documento_extra4[0].filename;
            }

            // Handle signatures (base64 from signature_pad)
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
            }

            const jugador = await Jugador.create(jugadorData);

            // Automatically create a payment record for the current month
            const fechaActual = new Date();

            // Get the escuela to find out the default monthly fee
            let montoDefault = 0;
            if (jugador.escuela_id) {
                const esc = await Escuela.findByPk(jugador.escuela_id);
                if (esc) {
                    montoDefault = parseFloat(esc.precio_mensualidad) || 0;
                }
            }

            await Pago.create({
                jugador_id: jugador.id,
                mes: fechaActual.getMonth() + 1,
                anio: fechaActual.getFullYear(),
                monto: montoDefault,
                estado: 'pendiente'
            });

            res.status(201).json({ success: true, data: jugador, message: 'Jugador registrado exitosamente' });
        } catch (error) {
            console.error('Error creando jugador:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'Ya existe un jugador con este documento' });
            }
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({ success: false, message: error.errors.map(e => e.message).join(', ') });
            }
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /api/jugadores/:id
    actualizar: async (req, res) => {
        try {
            const jugador = await Jugador.findByPk(req.params.id);

            if (!jugador) {
                return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
            }

            // Security: Verify the player belongs to the user's school
            if (req.user.rol !== 'superadmin' && req.user.escuela_id && jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para editar este jugador' });
            }

            const jugadorData = { ...req.body };

            // Prevent non-superadmin from changing school assignment
            if (req.user.rol !== 'superadmin') {
                delete jugadorData.escuela_id;
            }

            // Handle uploaded files (max 5)
            if (req.files) {
                if (req.files.foto) {
                    eliminarArchivo(jugador.foto);
                    jugadorData.foto = '/uploads/fotos/' + req.files.foto[0].filename;
                }
                if (req.files.registro_civil) {
                    eliminarArchivo(jugador.registro_civil);
                    jugadorData.registro_civil = '/uploads/documentos/' + req.files.registro_civil[0].filename;
                }
                if (req.files.documento_acudiente) {
                    eliminarArchivo(jugador.documento_acudiente);
                    jugadorData.documento_acudiente = '/uploads/documentos/' + req.files.documento_acudiente[0].filename;
                }
                if (req.files.documento_extra1) {
                    eliminarArchivo(jugador.documento_extra1);
                    jugadorData.documento_extra1 = '/uploads/documentos/' + req.files.documento_extra1[0].filename;
                }
                if (req.files.documento_extra2) {
                    eliminarArchivo(jugador.documento_extra2);
                    jugadorData.documento_extra2 = '/uploads/documentos/' + req.files.documento_extra2[0].filename;
                }
                if (req.files.documento_extra3) {
                    eliminarArchivo(jugador.documento_extra3);
                    jugadorData.documento_extra3 = '/uploads/documentos/' + req.files.documento_extra3[0].filename;
                }
                if (req.files.documento_extra4) {
                    eliminarArchivo(jugador.documento_extra4);
                    jugadorData.documento_extra4 = '/uploads/documentos/' + req.files.documento_extra4[0].filename;
                }
            }

            // Handle signature update
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

            await jugador.update(jugadorData);
            res.json({ success: true, data: jugador, message: 'Jugador actualizado exitosamente' });
        } catch (error) {
            console.error('Error actualizando jugador:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'Ya existe un jugador con este documento' });
            }
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /api/jugadores/:id
    eliminar: async (req, res) => {
        try {
            const jugador = await Jugador.findByPk(req.params.id);

            if (!jugador) {
                return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
            }

            // Security: Verify the player belongs to the user's school
            if (req.user.rol !== 'superadmin' && req.user.escuela_id && jugador.escuela_id !== req.user.escuela_id) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este jugador' });
            }

            // Delete all associated files (max 5 + firma)
            eliminarArchivo(jugador.foto);
            eliminarArchivo(jugador.registro_civil);
            eliminarArchivo(jugador.documento_acudiente);
            eliminarArchivo(jugador.documento_extra1);
            eliminarArchivo(jugador.documento_extra2);
            eliminarArchivo(jugador.documento_extra3);
            eliminarArchivo(jugador.documento_extra4);
            eliminarArchivo(jugador.firma_padre);
            eliminarArchivo(jugador.firma_entrenador);

            await jugador.destroy();
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

            const totalJugadores = await Jugador.count({ where: escuelaFilter });

            const categorias = await Categoria.findAll({
                include: [{
                    model: Jugador,
                    as: 'jugadores',
                    attributes: ['id'],
                    where: Object.keys(escuelaFilter).length > 0 ? escuelaFilter : undefined
                }]
            });

            const escuelas = await Escuela.findAll({
                include: [{
                    model: Jugador,
                    as: 'jugadores',
                    attributes: ['id'],
                    where: Object.keys(escuelaFilter).length > 0 ? escuelaFilter : undefined
                }]
            });

            const porCategoria = categorias.map(cat => ({
                nombre: cat.nombre,
                total: cat.jugadores ? cat.jugadores.length : 0
            }));

            const porEscuela = escuelas.map(esc => ({
                nombre: esc.nombre,
                total: esc.jugadores ? esc.jugadores.length : 0
            }));

            const totalEscuelas = req.user.rol === 'superadmin' ? escuelas.length : 1;

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

const { Escuela, Jugador } = require('../models');
const path = require('path');
const fs = require('fs');

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

const escuelaController = {
    // GET /escuelas/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/escuelas' });
    },

    // GET /escuelas/mi-escuela/page
    miEscuelaPage: (req, res) => {
        if (!req.user.escuela_id && req.user.rol !== 'superadmin') return res.redirect('/dashboard');
        res.sendFile('mi-escuela.html', { root: './views/escuelas' });
    },

    // GET /api/escuelas
    listar: async (req, res) => {
        try {
            const escuelas = await Escuela.findAll({
                include: [{
                    model: Jugador,
                    as: 'jugadores',
                    attributes: ['id']
                }],
                order: [['nombre', 'ASC']]
            });

            const data = escuelas.map(esc => ({
                ...esc.toJSON(),
                total_jugadores: esc.jugadores ? esc.jugadores.length : 0
            }));

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error listando escuelas:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /api/escuelas/:id
    obtener: async (req, res) => {
        try {
            const escuela = await Escuela.findByPk(req.params.id, {
                include: [{
                    model: Jugador,
                    as: 'jugadores',
                    attributes: ['id', 'nombre', 'fecha_nacimiento', 'documento', 'foto']
                }]
            });

            if (!escuela) {
                return res.status(404).json({ success: false, message: 'Escuela no encontrada' });
            }

            res.json({ success: true, data: escuela });
        } catch (error) {
            console.error('Error obteniendo escuela:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /api/escuelas/mi-escuela/api
    obtenerMiEscuela: async (req, res) => {
        try {
            if (!req.user.escuela_id) return res.status(404).json({ success: false, message: 'No tienes escuela asignada' });
            const escuela = await Escuela.findByPk(req.user.escuela_id);
            if (!escuela) return res.status(404).json({ success: false, message: 'Escuela no encontrada' });
            res.json({ success: true, data: escuela });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /api/escuelas/mi-escuela/api
    actualizarMiEscuela: async (req, res) => {
        try {
            if (!req.user.escuela_id) return res.status(404).json({ success: false, message: 'No tienes escuela asignada' });
            const escuela = await Escuela.findByPk(req.user.escuela_id);
            if (!escuela) return res.status(404).json({ success: false, message: 'Escuela no encontrada' });

            const { telefono, email } = req.body;
            let dataToUpdate = {
                telefono: telefono || null,
                email: email ? email : null
            };

            // Si el body trae nombre y estamos restringiendo el nombre a que el superadmin lo cambie
            // podemos agregarlo o ignorarlo.
            if (req.body.nombre !== undefined) dataToUpdate.nombre = req.body.nombre;
            if (req.body.direccion !== undefined) dataToUpdate.direccion = req.body.direccion || null;
            if (req.body.director !== undefined) dataToUpdate.director = req.body.director || null;
            if (req.body.precio_mensualidad !== undefined) dataToUpdate.precio_mensualidad = parseFloat(req.body.precio_mensualidad) || 0;

            if (req.file) {
                eliminarArchivo(escuela.logo);
                dataToUpdate.logo = '/uploads/logos/' + req.file.filename;
            }

            await escuela.update(dataToUpdate);
            res.json({ success: true, data: escuela, message: 'Escuela actualizada exitosamente' });
        } catch (error) {
            console.error(error);
            if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ success: false, message: 'Nombre en uso.' });
            if (error.name === 'SequelizeValidationError') return res.status(400).json({ success: false, message: error.errors.map(e => e.message).join(', ') });
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // POST /api/escuelas
    crear: async (req, res) => {
        try {
            const { nombre, direccion, telefono, director, email, precio_mensualidad } = req.body;

            if (!nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la escuela es requerido'
                });
            }

            const dataToCreate = {
                nombre,
                direccion: direccion || null,
                telefono: telefono || null,
                director: director || null,
                email: email ? email : null,
                precio_mensualidad: precio_mensualidad || 0
            };
            if (req.file) dataToCreate.logo = '/uploads/logos/' + req.file.filename;

            const escuela = await Escuela.create(dataToCreate);
            res.status(201).json({ success: true, data: escuela, message: 'Escuela creada exitosamente' });
        } catch (error) {
            console.error('Error creando escuela:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'Ya existe una escuela con este nombre' });
            }
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({ success: false, message: error.errors.map(e => e.message).join(', ') });
            }
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /api/escuelas/:id
    actualizar: async (req, res) => {
        try {
            const { nombre, direccion, telefono, director, email, activa, precio_mensualidad } = req.body;
            const escuela = await Escuela.findByPk(req.params.id);

            if (!escuela) {
                return res.status(404).json({ success: false, message: 'Escuela no encontrada' });
            }

            let dataToUpdate = {
                nombre,
                direccion: direccion || null,
                telefono: telefono || null,
                director: director || null,
                email: email ? email : null,
                activa,
                precio_mensualidad: precio_mensualidad || 0
            };
            if (req.file) {
                eliminarArchivo(escuela.logo);
                dataToUpdate.logo = '/uploads/logos/' + req.file.filename;
            }

            await escuela.update(dataToUpdate);
            res.json({ success: true, data: escuela, message: 'Escuela actualizada exitosamente' });
        } catch (error) {
            console.error('Error actualizando escuela:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'Ya existe una escuela con este nombre' });
            }
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /api/escuelas/:id
    eliminar: async (req, res) => {
        try {
            const escuela = await Escuela.findByPk(req.params.id, {
                include: [{ model: Jugador, as: 'jugadores', attributes: ['id'] }]
            });

            if (!escuela) {
                return res.status(404).json({ success: false, message: 'Escuela no encontrada' });
            }

            if (escuela.jugadores && escuela.jugadores.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede eliminar. Hay ${escuela.jugadores.length} jugador(es) en esta escuela.`
                });
            }

            eliminarArchivo(escuela.logo);

            await escuela.destroy();
            res.json({ success: true, message: 'Escuela eliminada exitosamente' });
        } catch (error) {
            console.error('Error eliminando escuela:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

module.exports = escuelaController;

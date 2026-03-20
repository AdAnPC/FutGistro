const { Categoria, Jugador } = require('../models');

const categoriaController = {
    // GET /categorias/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/categorias' });
    },

    // GET /api/categorias
    listar: async (req, res) => {
        try {
            let jugadorWhere = {};
            if (req.user && req.user.rol !== 'superadmin') {
                if (req.user.escuela_id) {
                    jugadorWhere.escuela_id = req.user.escuela_id;
                } else {
                    jugadorWhere.id = -1;
                }
            }

            const categorias = await Categoria.findAll({
                include: [{
                    model: Jugador,
                    as: 'jugadores',
                    attributes: ['id'],
                    where: Object.keys(jugadorWhere).length > 0 ? jugadorWhere : undefined,
                    required: false
                }],
                order: [['edad_min', 'ASC']]
            });

            const data = categorias.map(cat => ({
                ...cat.toJSON(),
                total_jugadores: cat.jugadores ? cat.jugadores.length : 0
            }));

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error listando categorías:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /api/categorias/:id
    obtener: async (req, res) => {
        try {
            let jugadorWhere = {};
            if (req.user && req.user.rol !== 'superadmin') {
                if (req.user.escuela_id) {
                    jugadorWhere.escuela_id = req.user.escuela_id;
                } else {
                    jugadorWhere.id = -1;
                }
            }

            const categoria = await Categoria.findByPk(req.params.id, {
                include: [{
                    model: Jugador,
                    as: 'jugadores',
                    attributes: ['id', 'nombre', 'fecha_nacimiento', 'documento', 'foto'],
                    where: Object.keys(jugadorWhere).length > 0 ? jugadorWhere : undefined,
                    required: false
                }]
            });

            if (!categoria) {
                return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
            }

            res.json({ success: true, data: categoria });
        } catch (error) {
            console.error('Error obteniendo categoría:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // POST /api/categorias
    crear: async (req, res) => {
        try {
            const { nombre, edad_min, edad_max } = req.body;

            if (!nombre || !edad_min || !edad_max) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre, edad mínima y edad máxima son requeridos'
                });
            }

            if (parseInt(edad_min) > parseInt(edad_max)) {
                return res.status(400).json({
                    success: false,
                    message: 'La edad mínima no puede ser mayor que la edad máxima'
                });
            }

            const categoria = await Categoria.create({ nombre, edad_min, edad_max });
            res.status(201).json({ success: true, data: categoria, message: 'Categoría creada exitosamente' });
        } catch (error) {
            console.error('Error creando categoría:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'Ya existe una categoría con este nombre' });
            }
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({ success: false, message: error.errors.map(e => e.message).join(', ') });
            }
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /api/categorias/:id
    actualizar: async (req, res) => {
        try {
            const { nombre, edad_min, edad_max } = req.body;
            const categoria = await Categoria.findByPk(req.params.id);

            if (!categoria) {
                return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
            }

            if (parseInt(edad_min) > parseInt(edad_max)) {
                return res.status(400).json({
                    success: false,
                    message: 'La edad mínima no puede ser mayor que la edad máxima'
                });
            }

            await categoria.update({ nombre, edad_min, edad_max });
            res.json({ success: true, data: categoria, message: 'Categoría actualizada exitosamente' });
        } catch (error) {
            console.error('Error actualizando categoría:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'Ya existe una categoría con este nombre' });
            }
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /api/categorias/:id
    eliminar: async (req, res) => {
        try {
            const categoria = await Categoria.findByPk(req.params.id, {
                include: [{ model: Jugador, as: 'jugadores', attributes: ['id'] }]
            });

            if (!categoria) {
                return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
            }

            if (categoria.jugadores && categoria.jugadores.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede eliminar. Hay ${categoria.jugadores.length} jugador(es) en esta categoría.`
                });
            }

            await categoria.destroy();
            res.json({ success: true, message: 'Categoría eliminada exitosamente' });
        } catch (error) {
            console.error('Error eliminando categoría:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

module.exports = categoriaController;

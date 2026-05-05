const { db } = require('../db');
const { categorias, jugadores } = require('../db/schema.js');
const { eq, asc, and } = require('drizzle-orm');

const categoriaController = {
    // GET /categorias/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/categorias' });
    },

    // GET /api/categorias
    listar: async (req, res) => {
        try {
            let userEscuelaId = null;
            if (req.user && req.user.rol !== 'superadmin') {
                if (req.user.escuela_id) {
                    userEscuelaId = req.user.escuela_id;
                } else {
                    userEscuelaId = -1;
                }
            }

            // Using relational queries
            const listaCategorias = await db.query.categorias.findMany({
                with: {
                    jugadores: userEscuelaId !== null ? {
                        where: eq(jugadores.escuela_id, userEscuelaId),
                        columns: { id: true }
                    } : { columns: { id: true } }
                },
                orderBy: [asc(categorias.edad_min)]
            });

            const data = listaCategorias.map(cat => ({
                ...cat,
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
            const id = parseInt(req.params.id);
            let userEscuelaId = null;
            if (req.user && req.user.rol !== 'superadmin') {
                if (req.user.escuela_id) {
                    userEscuelaId = req.user.escuela_id;
                } else {
                    userEscuelaId = -1;
                }
            }

            const categoria = await db.query.categorias.findFirst({
                where: eq(categorias.id, id),
                with: {
                    jugadores: userEscuelaId !== null ? {
                        where: eq(jugadores.escuela_id, userEscuelaId),
                        columns: { id: true, nombre: true, fecha_nacimiento: true, documento: true, foto: true }
                    } : {
                        columns: { id: true, nombre: true, fecha_nacimiento: true, documento: true, foto: true }
                    }
                }
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

            // Check if name already exists
            const existe = await db.query.categorias.findFirst({ where: eq(categorias.nombre, nombre) });
            if (existe) {
                return res.status(400).json({ success: false, message: 'Ya existe una categoría con este nombre' });
            }

            const insertResult = await db.insert(categorias).values({
                nombre,
                edad_min: parseInt(edad_min),
                edad_max: parseInt(edad_max)
            }).returning();

            res.status(201).json({ success: true, data: insertResult[0], message: 'Categoría creada exitosamente' });
        } catch (error) {
            console.error('Error creando categoría:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /api/categorias/:id
    actualizar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { nombre, edad_min, edad_max } = req.body;
            
            const categoria = await db.query.categorias.findFirst({ where: eq(categorias.id, id) });

            if (!categoria) {
                return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
            }

            if (parseInt(edad_min) > parseInt(edad_max)) {
                return res.status(400).json({
                    success: false,
                    message: 'La edad mínima no puede ser mayor que la edad máxima'
                });
            }

            if (nombre && nombre !== categoria.nombre) {
                const existe = await db.query.categorias.findFirst({ where: eq(categorias.nombre, nombre) });
                if (existe) {
                    return res.status(400).json({ success: false, message: 'Ya existe una categoría con este nombre' });
                }
            }

            const updateResult = await db.update(categorias).set({
                nombre,
                edad_min: parseInt(edad_min),
                edad_max: parseInt(edad_max)
            }).where(eq(categorias.id, id)).returning();

            res.json({ success: true, data: updateResult[0], message: 'Categoría actualizada exitosamente' });
        } catch (error) {
            console.error('Error actualizando categoría:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /api/categorias/:id
    eliminar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const categoria = await db.query.categorias.findFirst({
                where: eq(categorias.id, id),
                with: { jugadores: { columns: { id: true } } }
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

            await db.delete(categorias).where(eq(categorias.id, id));
            res.json({ success: true, message: 'Categoría eliminada exitosamente' });
        } catch (error) {
            console.error('Error eliminando categoría:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

module.exports = categoriaController;

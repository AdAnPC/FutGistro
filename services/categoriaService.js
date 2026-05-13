const { db } = require('../db');
const { categorias, jugadores } = require('../db/schema.js');
const { eq, asc } = require('drizzle-orm');

const categoriaService = {
    getEscuelaId: (user) => {
        if (!user || user.rol === 'superadmin') return null;
        return user.escuela_id || -1;
    },

    listCategories: async (user) => {
        const userEscuelaId = categoriaService.getEscuelaId(user);

        const listaCategorias = await db.query.categorias.findMany({
            with: {
                jugadores: userEscuelaId !== null ? {
                    where: eq(jugadores.escuela_id, userEscuelaId),
                    columns: { id: true }
                } : { columns: { id: true } }
            },
            orderBy: [asc(categorias.edad_min)]
        });

        return listaCategorias.map(cat => ({
            ...cat,
            total_jugadores: cat.jugadores ? cat.jugadores.length : 0
        }));
    },

    getCategoryById: async (id, user) => {
        const userEscuelaId = categoriaService.getEscuelaId(user);

        return await db.query.categorias.findFirst({
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
    },

    createCategory: async (data) => {
        const { nombre, edad_min, edad_max } = data;
        
        if (parseInt(edad_min) > parseInt(edad_max)) {
            const err = new Error('La edad mínima no puede ser mayor que la edad máxima');
            err.statusCode = 400;
            throw err;
        }

        const existe = await db.query.categorias.findFirst({ where: eq(categorias.nombre, nombre) });
        if (existe) {
            const err = new Error('Ya existe una categoría con este nombre');
            err.statusCode = 400;
            throw err;
        }

        const insertResult = await db.insert(categorias).values({
            nombre,
            edad_min: parseInt(edad_min),
            edad_max: parseInt(edad_max)
        }).returning();

        return insertResult[0];
    },

    updateCategory: async (id, data) => {
        const { nombre, edad_min, edad_max } = data;
        const categoria = await db.query.categorias.findFirst({ where: eq(categorias.id, id) });

        if (!categoria) return null;

        if (parseInt(edad_min) > parseInt(edad_max)) {
            const err = new Error('La edad mínima no puede ser mayor que la edad máxima');
            err.statusCode = 400;
            throw err;
        }

        if (nombre && nombre !== categoria.nombre) {
            const existe = await db.query.categorias.findFirst({ where: eq(categorias.nombre, nombre) });
            if (existe) {
                const err = new Error('Ya existe una categoría con este nombre');
                err.statusCode = 400;
                throw err;
            }
        }

        const updateResult = await db.update(categorias).set({
            nombre,
            edad_min: parseInt(edad_min),
            edad_max: parseInt(edad_max)
        }).where(eq(categorias.id, id)).returning();

        return updateResult[0];
    },

    deleteCategory: async (id) => {
        const categoria = await db.query.categorias.findFirst({
            where: eq(categorias.id, id),
            with: { jugadores: { columns: { id: true } } }
        });

        if (!categoria) return null;

        if (categoria.jugadores && categoria.jugadores.length > 0) {
            const err = new Error(`No se puede eliminar. Hay ${categoria.jugadores.length} jugador(es) en esta categoría.`);
            err.statusCode = 400;
            throw err;
        }

        await db.delete(categorias).where(eq(categorias.id, id));
        return true;
    }
};

module.exports = categoriaService;

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { usuarios, escuelas } = require('../db/schema.js');
const { eq, desc } = require('drizzle-orm');

const authService = {
    generateToken: (user) => {
        return jwt.sign(
            {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                escuela_id: user.escuela_id || null,
                escuela_nombre: user.escuela ? user.escuela.nombre : null,
                escuela_logo: user.escuela ? user.escuela.logo : null
            },
            process.env.JWT_SECRET || 'fallback_secret_for_emergency_only',
            { expiresIn: '8h' }
        );
    },

    login: async (email, password) => {
        const usuario = await db.query.usuarios.findFirst({
            where: eq(usuarios.email, email),
            with: { escuela: { columns: { id: true, nombre: true, logo: true, ciudad: true, departamento: true } } }
        });

        if (!usuario) return null;

        const validPassword = await bcrypt.compare(password, usuario.password);
        if (!validPassword) return null;

        return usuario;
    },

    register: async (data) => {
        const { nombre, email, password, rol, escuela_nombre } = data;
        const finalRol = rol || 'entrenador';

        const existeUsuario = await db.query.usuarios.findFirst({ where: eq(usuarios.email, email) });
        if (existeUsuario) {
            const err = new Error('Ya existe un usuario con este email');
            err.statusCode = 400;
            throw err;
        }

        let escuelaId = null;
        if (finalRol !== 'superadmin' && escuela_nombre) {
            const escuelaNombreLimpio = escuela_nombre.trim();
            let escuela = await db.query.escuelas.findFirst({ where: eq(escuelas.nombre, escuelaNombreLimpio) });
            if (!escuela) {
                const insertResult = await db.insert(escuelas).values({ nombre: escuelaNombreLimpio, activa: true }).returning();
                escuela = insertResult[0];
            }
            escuelaId = escuela.id;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.insert(usuarios).values({
            nombre,
            email,
            password: hashedPassword,
            rol: finalRol,
            escuela_id: escuelaId
        });

        return true;
    },

    listUsers: async () => {
        return await db.query.usuarios.findMany({
            columns: { id: true, nombre: true, email: true, rol: true, escuela_id: true, createdAt: true },
            with: { escuela: { columns: { id: true, nombre: true } } },
            orderBy: [desc(usuarios.createdAt)]
        });
    },

    deleteUser: async (id, currentUserId) => {
        if (parseInt(id) === currentUserId) {
            const err = new Error('No puedes eliminar tu propio usuario');
            err.statusCode = 400;
            throw err;
        }
        await db.delete(usuarios).where(eq(usuarios.id, parseInt(id)));
        return true;
    },

    updateUser: async (id, data) => {
        const usuario = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id) });
        if (!usuario) return null;

        const { nombre, rol, escuela_id } = data;
        const updateData = {};
        if (nombre) updateData.nombre = nombre;
        if (rol) updateData.rol = rol;
        if (escuela_id !== undefined) updateData.escuela_id = escuela_id || null;

        if (Object.keys(updateData).length > 0) {
            await db.update(usuarios).set(updateData).where(eq(usuarios.id, id));
        }
        
        return await db.query.usuarios.findFirst({
            where: eq(usuarios.id, id),
            columns: { id: true, nombre: true, email: true, rol: true, escuela_id: true },
            with: { escuela: { columns: { id: true, nombre: true } } }
        });
    },

    getUserProfile: async (id) => {
        return await db.query.usuarios.findFirst({
            where: eq(usuarios.id, id),
            with: { escuela: { columns: { id: true, nombre: true, logo: true, ciudad: true, departamento: true } } }
        });
    },

    selectSchool: async (userId, schoolName) => {
        const escuelaNombreLimpio = schoolName.trim();
        let escuela = await db.query.escuelas.findFirst({ where: eq(escuelas.nombre, escuelaNombreLimpio) });
        
        if (!escuela) {
            const insertResult = await db.insert(escuelas).values({ nombre: escuelaNombreLimpio, activa: true }).returning();
            escuela = insertResult[0];
        }

        const usuario = await db.query.usuarios.findFirst({ where: eq(usuarios.id, userId) });
        if (!usuario) return null;

        await db.update(usuarios).set({ escuela_id: escuela.id }).where(eq(usuarios.id, userId));

        const updatedUser = { ...usuario, escuela_id: escuela.id, escuela };
        return updatedUser;
    }
};

module.exports = authService;

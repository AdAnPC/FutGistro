const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { usuarios, escuelas } = require('../db/schema.js');
const { eq, desc } = require('drizzle-orm');

const authController = {
    // GET /auth/login
    loginPage: (req, res) => {
        res.sendFile('login.html', { root: './views/auth' });
    },

    // POST /auth/login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email y contraseña son requeridos'
                });
            }

            const usuario = await db.query.usuarios.findFirst({
                where: eq(usuarios.email, email),
                with: { escuela: { columns: { id: true, nombre: true, logo: true, ciudad: true, departamento: true } } }
            });

            if (!usuario) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales incorrectas'
                });
            }

            const validPassword = await bcrypt.compare(password, usuario.password);

            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales incorrectas'
                });
            }

            const token = jwt.sign(
                {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol,
                    escuela_id: usuario.escuela_id || null,
                    escuela_nombre: usuario.escuela ? usuario.escuela.nombre : null,
                    escuela_logo: usuario.escuela ? usuario.escuela.logo : null
                },
                process.env.JWT_SECRET || 'fallback_secret_for_emergency_only',
                { expiresIn: '8h' }
            );

            req.session.token = token;

            return res.json({
                success: true,
                message: 'Login exitoso',
                redirect: '/dashboard'
            });
        } catch (error) {
            console.error('Error en login:', error);
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
    },

    // GET /auth/registro
    registroPage: (req, res) => {
        res.sendFile('registro.html', { root: './views/auth' });
    },

    // POST /auth/registro
    registro: async (req, res) => {
        try {
            const { nombre, email, password, rol, escuela_nombre } = req.body;

            if (!nombre || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos los campos son requeridos'
                });
            }

            const finalRol = rol || 'entrenador';
            if (finalRol !== 'superadmin' && !escuela_nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'Debes escribir el nombre de tu escuela'
                });
            }

            const existeUsuario = await db.query.usuarios.findFirst({ where: eq(usuarios.email, email) });
            if (existeUsuario) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un usuario con este email'
                });
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

            return res.json({
                success: true,
                message: 'Usuario y escuela creados exitosamente',
                redirect: '/auth/login'
            });
        } catch (error) {
            console.error('Error en registro:', error);
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
    },

    // GET /auth/logout
    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) console.error('Error al cerrar sesión:', err);
            res.redirect('/auth/login');
        });
    },

    // GET /auth/usuarios (admin only)
    listarUsuarios: async (req, res) => {
        try {
            const listaUsuarios = await db.query.usuarios.findMany({
                columns: { id: true, nombre: true, email: true, rol: true, escuela_id: true, createdAt: true },
                with: { escuela: { columns: { id: true, nombre: true } } },
                orderBy: [desc(usuarios.createdAt)]
            });
            res.json({ success: true, data: listaUsuarios });
        } catch (error) {
            console.error('Error listando usuarios:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // DELETE /auth/usuarios/:id (admin only)
    eliminarUsuario: async (req, res) => {
        try {
            const { id } = req.params;
            if (parseInt(id) === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'No puedes eliminar tu propio usuario'
                });
            }
            await db.delete(usuarios).where(eq(usuarios.id, parseInt(id)));
            res.json({ success: true, message: 'Usuario eliminado' });
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /auth/usuarios/:id (admin only)
    actualizarUsuario: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const usuario = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id) });
            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            const { nombre, rol, escuela_id } = req.body;
            const updateData = {};
            if (nombre) updateData.nombre = nombre;
            if (rol) updateData.rol = rol;
            if (escuela_id !== undefined) updateData.escuela_id = escuela_id || null;

            if (Object.keys(updateData).length > 0) {
                await db.update(usuarios).set(updateData).where(eq(usuarios.id, id));
            }
            
            const updated = await db.query.usuarios.findFirst({
                where: eq(usuarios.id, id),
                columns: { id: true, nombre: true, email: true, rol: true, escuela_id: true },
                with: { escuela: { columns: { id: true, nombre: true } } }
            });

            res.json({ success: true, data: updated, message: 'Usuario actualizado' });
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // GET /auth/me
    me: async (req, res) => {
        try {
            const usuario = await db.query.usuarios.findFirst({
                where: eq(usuarios.id, req.user.id),
                with: { escuela: { columns: { id: true, nombre: true, logo: true, ciudad: true, departamento: true } } }
            });
            
            if(!usuario) {
               return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
            }

            res.json({
                success: true,
                data: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol,
                    escuela_id: usuario.escuela_id || null,
                    escuela_nombre: usuario.escuela ? usuario.escuela.nombre : null,
                    escuela_logo: usuario.escuela ? usuario.escuela.logo : null,
                    escuela_ciudad: usuario.escuela ? usuario.escuela.ciudad : null,
                    escuela_departamento: usuario.escuela ? usuario.escuela.departamento : null,
                    necesita_escuela: usuario.rol !== 'superadmin' && !usuario.escuela_id
                }
            });
        } catch (error) {
            console.error('Error en /auth/me:', error);
            res.status(500).json({ success: false, message: 'Error interno' });
        }
    },

    // POST /auth/seleccionar-escuela
    seleccionarEscuela: async (req, res) => {
        try {
            const { escuela_nombre } = req.body;
            if (!escuela_nombre || !escuela_nombre.trim()) {
                return res.status(400).json({ success: false, message: 'Debes escribir el nombre de tu escuela' });
            }

            const escuelaNombreLimpio = escuela_nombre.trim();
            let escuela = await db.query.escuelas.findFirst({ where: eq(escuelas.nombre, escuelaNombreLimpio) });
            
            if (!escuela) {
                const insertResult = await db.insert(escuelas).values({ nombre: escuelaNombreLimpio, activa: true }).returning();
                escuela = insertResult[0];
            }

            const usuario = await db.query.usuarios.findFirst({ where: eq(usuarios.id, req.user.id) });
            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            await db.update(usuarios).set({ escuela_id: escuela.id }).where(eq(usuarios.id, req.user.id));

            const token = jwt.sign(
                {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol,
                    escuela_id: escuela.id,
                    escuela_nombre: escuela.nombre
                },
                process.env.JWT_SECRET || 'fallback_secret_for_emergency_only',
                { expiresIn: '8h' }
            );

            req.session.token = token;

            return res.json({
                success: true,
                message: 'Escuela creada exitosamente',
                redirect: '/dashboard'
            });
        } catch (error) {
            console.error('Error seleccionando escuela:', error);
            return res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    }
};

module.exports = authController;

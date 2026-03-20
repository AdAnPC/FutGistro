const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario, Escuela } = require('../models');

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

            const usuario = await Usuario.findOne({
                where: { email },
                include: [{ model: Escuela, as: 'escuela', attributes: ['id', 'nombre', 'logo'] }]
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

            // Escuela name is required for non-superadmin users
            const finalRol = rol || 'entrenador';
            if (finalRol !== 'superadmin' && !escuela_nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'Debes escribir el nombre de tu escuela'
                });
            }

            const existeUsuario = await Usuario.findOne({ where: { email } });
            if (existeUsuario) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un usuario con este email'
                });
            }

            // Create or find the school by name
            let escuelaId = null;
            if (finalRol !== 'superadmin' && escuela_nombre) {
                const [escuela] = await Escuela.findOrCreate({
                    where: { nombre: escuela_nombre.trim() },
                    defaults: { nombre: escuela_nombre.trim(), activa: true }
                });
                escuelaId = escuela.id;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await Usuario.create({
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
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({
                    success: false,
                    message: error.errors.map(e => e.message).join(', ')
                });
            }
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
            const usuarios = await Usuario.findAll({
                attributes: ['id', 'nombre', 'email', 'rol', 'escuela_id', 'created_at'],
                include: [{ model: Escuela, as: 'escuela', attributes: ['id', 'nombre'] }],
                order: [['created_at', 'DESC']]
            });
            res.json({ success: true, data: usuarios });
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
            await Usuario.destroy({ where: { id } });
            res.json({ success: true, message: 'Usuario eliminado' });
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            res.status(500).json({ success: false, message: 'Error en el servidor' });
        }
    },

    // PUT /auth/usuarios/:id (admin only)
    actualizarUsuario: async (req, res) => {
        try {
            const { id } = req.params;
            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            const { nombre, rol, escuela_id } = req.body;
            const updateData = {};
            if (nombre) updateData.nombre = nombre;
            if (rol) updateData.rol = rol;
            if (escuela_id !== undefined) updateData.escuela_id = escuela_id || null;

            await usuario.update(updateData);
            
            const updated = await Usuario.findByPk(id, {
                attributes: ['id', 'nombre', 'email', 'rol', 'escuela_id'],
                include: [{ model: Escuela, as: 'escuela', attributes: ['id', 'nombre'] }]
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
            const usuario = await Usuario.findByPk(req.user.id, {
                include: [{ model: Escuela, as: 'escuela', attributes: ['id', 'nombre', 'logo'] }]
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
                    necesita_escuela: usuario.rol !== 'superadmin' && !usuario.escuela_id
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error interno' });
        }
    },

    // POST /auth/seleccionar-escuela - User creates their school (first time)
    seleccionarEscuela: async (req, res) => {
        try {
            const { escuela_nombre } = req.body;
            if (!escuela_nombre || !escuela_nombre.trim()) {
                return res.status(400).json({ success: false, message: 'Debes escribir el nombre de tu escuela' });
            }

            // Create or find the school
            const [escuela] = await Escuela.findOrCreate({
                where: { nombre: escuela_nombre.trim() },
                defaults: { nombre: escuela_nombre.trim(), activa: true }
            });

            // Update user in DB
            const usuario = await Usuario.findByPk(req.user.id);
            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            await usuario.update({ escuela_id: escuela.id });

            // Generate new JWT with escuela info
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

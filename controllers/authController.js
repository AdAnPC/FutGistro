const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const response = require('../utils/response');
const AppError = require('../utils/AppError');

const authController = {
    // GET /auth/login
    loginPage: (req, res) => {
        res.sendFile('login.html', { root: './views/auth' });
    },

    // POST /auth/login
    login: catchAsync(async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new AppError('Email y contraseña son requeridos', 400);
        }

        const usuario = await authService.login(email, password);

        if (!usuario) {
            throw new AppError('Credenciales incorrectas', 401);
        }

        const token = authService.generateToken(usuario);
        req.session.token = token;

        response.success(res, { redirect: '/dashboard' }, 'Login exitoso');
    }),

    // GET /auth/registro
    registroPage: (req, res) => {
        res.sendFile('registro.html', { root: './views/auth' });
    },

    // POST /auth/registro
    registro: catchAsync(async (req, res) => {
        const { nombre, email, password, rol, escuela_nombre } = req.body;

        if (!nombre || !email || !password) {
            throw new AppError('Todos los campos son requeridos', 400);
        }

        if ((!rol || rol !== 'superadmin') && !escuela_nombre) {
            throw new AppError('Debes escribir el nombre de tu escuela', 400);
        }

        await authService.register(req.body);

        response.success(res, { redirect: '/auth/login' }, 'Usuario y escuela creados exitosamente');
    }),

    // GET /auth/logout
    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) console.error('Error al cerrar sesión:', err);
            res.redirect('/auth/login');
        });
    },

    // GET /auth/usuarios (admin only)
    listarUsuarios: catchAsync(async (req, res) => {
        const users = await authService.listUsers();
        response.success(res, users);
    }),

    // DELETE /auth/usuarios/:id (admin only)
    eliminarUsuario: catchAsync(async (req, res) => {
        const { id } = req.params;
        await authService.deleteUser(id, req.user.id);
        response.success(res, null, 'Usuario eliminado');
    }),

    // PUT /auth/usuarios/:id (admin only)
    actualizarUsuario: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const updated = await authService.updateUser(id, req.body);
        if (!updated) {
            throw new AppError('Usuario no encontrado', 404);
        }
        response.success(res, updated, 'Usuario actualizado');
    }),

    // GET /auth/me
    me: catchAsync(async (req, res) => {
        const usuario = await authService.getUserProfile(req.user.id);
        
        if(!usuario) {
            throw new AppError('Usuario no encontrado', 401);
        }

        response.success(res, {
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
        });
    }),

    // POST /auth/seleccionar-escuela
    seleccionarEscuela: catchAsync(async (req, res) => {
        const { escuela_nombre } = req.body;
        if (!escuela_nombre || !escuela_nombre.trim()) {
            throw new AppError('Debes escribir el nombre de tu escuela', 400);
        }

        const updatedUser = await authService.selectSchool(req.user.id, escuela_nombre);
        if (!updatedUser) {
            throw new AppError('Usuario no encontrado', 404);
        }

        const token = authService.generateToken(updatedUser);
        req.session.token = token;

        response.success(res, { redirect: '/dashboard' }, 'Escuela creada exitosamente');
    })
};

module.exports = authController;

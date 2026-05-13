const escuelaService = require('../services/escuelaService');
const catchAsync = require('../utils/catchAsync');
const response = require('../utils/response');
const AppError = require('../utils/AppError');

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
    listar: catchAsync(async (req, res) => {
        const data = await escuelaService.listSchools();
        response.success(res, data);
    }),

    // GET /api/escuelas/:id
    obtener: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const escuela = await escuelaService.getSchoolById(id);

        if (!escuela) {
            throw new AppError('Escuela no encontrada', 404);
        }

        response.success(res, escuela);
    }),

    // GET /api/escuelas/mi-escuela/api
    obtenerMiEscuela: catchAsync(async (req, res) => {
        if (!req.user.escuela_id) {
            throw new AppError('No tienes escuela asignada', 404);
        }
        const escuela = await escuelaService.getSchoolById(req.user.escuela_id);
        if (!escuela) {
            throw new AppError('Escuela no encontrada', 404);
        }
        response.success(res, escuela);
    }),

    // PUT /api/escuelas/mi-escuela/api
    actualizarMiEscuela: catchAsync(async (req, res) => {
        if (!req.user.escuela_id) {
            throw new AppError('No tienes escuela asignada', 404);
        }
        const updated = await escuelaService.updateSchool(req.user.escuela_id, req.body, req.file);
        if (!updated) {
            throw new AppError('Escuela no encontrada', 404);
        }
        response.success(res, updated, 'Escuela actualizada exitosamente');
    }),

    // POST /api/escuelas
    crear: catchAsync(async (req, res) => {
        const { nombre } = req.body;
        if (!nombre) {
            throw new AppError('El nombre de la escuela es requerido', 400);
        }

        const escuela = await escuelaService.createSchool(req.body, req.file);
        response.success(res, escuela, 'Escuela creada exitosamente', 201);
    }),

    // PUT /api/escuelas/:id
    actualizar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const updated = await escuelaService.updateSchool(id, req.body, req.file);
        if (!updated) {
            throw new AppError('Escuela no encontrada', 404);
        }
        response.success(res, updated, 'Escuela actualizada exitosamente');
    }),

    // DELETE /api/escuelas/:id
    eliminar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const success = await escuelaService.deleteSchool(id);
        
        if (success === null) {
            throw new AppError('Escuela no encontrada', 404);
        }

        response.success(res, null, 'Escuela eliminada exitosamente');
    })
};

module.exports = escuelaController;

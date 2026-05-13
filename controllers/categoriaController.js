const categoriaService = require('../services/categoriaService');
const catchAsync = require('../utils/catchAsync');
const response = require('../utils/response');
const AppError = require('../utils/AppError');

const categoriaController = {
    // GET /categorias/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/categorias' });
    },

    // GET /api/categorias
    listar: catchAsync(async (req, res) => {
        const data = await categoriaService.listCategories(req.user);
        response.success(res, data);
    }),

    // GET /api/categorias/:id
    obtener: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const categoria = await categoriaService.getCategoryById(id, req.user);

        if (!categoria) {
            throw new AppError('Categoría no encontrada', 404);
        }

        response.success(res, categoria);
    }),

    // POST /api/categorias
    crear: catchAsync(async (req, res) => {
        const { nombre, edad_min, edad_max } = req.body;

        if (!nombre || !edad_min || !edad_max) {
            throw new AppError('Nombre, edad mínima y edad máxima son requeridos', 400);
        }

        const categoria = await categoriaService.createCategory(req.body);
        response.success(res, categoria, 'Categoría creada exitosamente', 201);
    }),

    // PUT /api/categorias/:id
    actualizar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const { nombre, edad_min, edad_max } = req.body;

        if (!nombre || !edad_min || !edad_max) {
            throw new AppError('Nombre, edad mínima y edad máxima son requeridos', 400);
        }

        const updated = await categoriaService.updateCategory(id, req.body);
        if (!updated) {
            throw new AppError('Categoría no encontrada', 404);
        }

        response.success(res, updated, 'Categoría actualizada exitosamente');
    }),

    // DELETE /api/categorias/:id
    eliminar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const success = await categoriaService.deleteCategory(id);
        
        if (success === null) {
            throw new AppError('Categoría no encontrada', 404);
        }

        response.success(res, null, 'Categoría eliminada exitosamente');
    })
};

module.exports = categoriaController;

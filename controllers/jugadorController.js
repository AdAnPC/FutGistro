const jugadorService = require('../services/jugadorService');
const catchAsync = require('../utils/catchAsync');
const response = require('../utils/response');
const AppError = require('../utils/AppError');

const jugadorController = {
    // GET /jugadores/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/jugadores' });
    },

    // GET /jugadores/nuevo
    nuevoPage: (req, res) => {
        res.sendFile('formulario.html', { root: './views/jugadores' });
    },

    // GET /jugadores/editar/:id
    editarPage: (req, res) => {
        res.sendFile('formulario.html', { root: './views/jugadores' });
    },

    // GET /jugadores/ficha/:id
    fichaPage: (req, res) => {
        res.sendFile('ficha.html', { root: './views/jugadores' });
    },

    // GET /api/jugadores
    listar: catchAsync(async (req, res) => {
        const result = await jugadorService.listPlayers(req.query, req.user);
        res.status(200).json({
            success: true,
            ...result
        });
    }),

    // GET /api/jugadores/:id
    obtener: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        try {
            const jugador = await jugadorService.getPlayerById(id, req.user);
            if (!jugador) {
                return next(new AppError('Jugador no encontrado', 404));
            }
            response.success(res, jugador);
        } catch (error) {
            if (error.message === 'Unauthorized') {
                throw new AppError('No tienes permiso para ver este jugador', 403);
            }
            throw error;
        }
    }),

    // POST /api/upload-temp
    uploadTemp: catchAsync(async (req, res) => {
        if (!req.files || req.files.length === 0) {
            throw new AppError('No se subió ningún archivo', 400);
        }
        const file = req.files[0];
        let folder = 'documentos';
        if (file.fieldname === 'foto') folder = 'fotos';
        else if (file.fieldname === 'logo') folder = 'logos';
        else if (file.fieldname === 'firma_padre' || file.fieldname === 'firma_entrenador') folder = 'firmas';

        const filePath = `/uploads/${folder}/${file.filename}`;
        res.status(200).json({ success: true, url: filePath, fieldname: file.fieldname });
    }),

    // POST /api/jugadores
    crear: catchAsync(async (req, res) => {
        const jugador = await jugadorService.createPlayer(req.body, req.user, req.files);
        response.success(res, jugador, 'Jugador registrado exitosamente', 201);
    }),

    // PUT /api/jugadores/:id
    actualizar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        try {
            const jugador = await jugadorService.updatePlayer(id, req.body, req.user, req.files);
            if (!jugador) {
                throw new AppError('Jugador no encontrado', 404);
            }
            response.success(res, jugador, 'Jugador actualizado exitosamente');
        } catch (error) {
            if (error.message === 'Unauthorized') {
                throw new AppError('No tienes permiso para editar este jugador', 403);
            }
            throw error;
        }
    }),

    // DELETE /api/jugadores/:id
    eliminar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        try {
            const success = await jugadorService.deletePlayer(id, req.user);
            if (!success) {
                throw new AppError('Jugador no encontrado', 404);
            }
            response.success(res, null, 'Jugador eliminado exitosamente');
        } catch (error) {
            if (error.message === 'Unauthorized') {
                throw new AppError('No tienes permiso para eliminar este jugador', 403);
            }
            throw error;
        }
    }),

    // GET /api/jugadores/estadisticas
    estadisticas: catchAsync(async (req, res) => {
        const stats = await jugadorService.getStats(req.user);
        response.success(res, stats);
    })
};

module.exports = jugadorController;

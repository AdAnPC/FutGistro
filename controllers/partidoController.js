const partidoService = require('../services/partidoService');
const catchAsync = require('../utils/catchAsync');
const response = require('../utils/response');
const AppError = require('../utils/AppError');

const partidoController = {
    listarPorTorneo: catchAsync(async (req, res) => {
        const torneoId = parseInt(req.params.torneoId);
        const data = await partidoService.listByTournament(torneoId);
        response.success(res, data);
    }),

    obtener: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const data = await partidoService.getMatchById(id);

        if (!data) {
            throw new AppError('Partido no encontrado', 404);
        }

        response.success(res, data);
    }),

    crear: catchAsync(async (req, res) => {
        const match = await partidoService.createMatch(req.body);
        response.success(res, match, 'Partido programado exitosamente');
    }),

    actualizar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const updated = await partidoService.updateMatch(id, req.body);
        
        if (!updated) {
            throw new AppError('Partido no encontrado', 404);
        }

        response.success(res, updated, 'Partido actualizado correctamente');
    }),

    eliminar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const success = await partidoService.deleteMatch(id);
        
        if (!success) {
            throw new AppError('Partido no encontrado', 404);
        }

        response.success(res, null, 'Partido eliminado correctamente');
    })
};

module.exports = partidoController;

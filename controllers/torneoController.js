const torneoService = require('../services/torneoService');
const catchAsync = require('../utils/catchAsync');
const response = require('../utils/response');
const AppError = require('../utils/AppError');

const torneoController = {
    // Listar todos los torneos
    listar: catchAsync(async (req, res) => {
        const data = await torneoService.listTournaments();
        response.success(res, data);
    }),

    // Obtener detalle de un torneo
    obtener: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const data = await torneoService.getTournamentById(id);

        if (!data) {
            throw new AppError('Torneo no encontrado', 404);
        }

        response.success(res, data);
    }),

    crear: catchAsync(async (req, res) => {
        const torneo = await torneoService.createTournament(req.body, req.user);
        response.success(res, torneo, 'Torneo creado exitosamente');
    }),

    actualizar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const updated = await torneoService.updateTournament(id, req.body);
        
        if (!updated) {
            throw new AppError('Torneo no encontrado', 404);
        }

        response.success(res, updated, 'Torneo actualizado exitosamente');
    }),

    eliminar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const success = await torneoService.deleteTournament(id);
        
        if (!success) {
            throw new AppError('Torneo no encontrado', 404);
        }

        response.success(res, null, 'Torneo eliminado exitosamente');
    }),

    // Acciones de participación
    participar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        if (!req.user.escuela_id) {
            throw new AppError('Debes pertenecer a una escuela', 400);
        }

        await torneoService.participate(id, req.user.escuela_id);
        response.success(res, null, 'Inscripción enviada exitosamente');
    }),

    invitar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const { escuela_id } = req.body;
        
        if (!escuela_id) {
            throw new AppError('Escuela ID es requerida', 400);
        }

        await torneoService.invite(id, parseInt(escuela_id));
        response.success(res, null, 'Invitación enviada');
    }),

    cambiarEstadoParticipante: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const escuela_id = parseInt(req.params.escuela_id);
        const { estado } = req.body;

        if (!estado) {
            throw new AppError('Estado es requerido', 400);
        }

        const success = await torneoService.updateParticipantStatus(id, escuela_id, estado);
        if (!success) {
            throw new AppError('Registro no encontrado', 404);
        }

        response.success(res, null, 'Estado actualizado');
    })
};

module.exports = torneoController;

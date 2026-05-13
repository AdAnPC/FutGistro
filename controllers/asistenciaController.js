const asistenciaService = require('../services/asistenciaService');
const catchAsync = require('../utils/catchAsync');
const response = require('../utils/response');
const AppError = require('../utils/AppError');

const asistenciaController = {
    // GET /asistencia/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/asistencia' });
    },

    // GET /api/asistencia
    listar: catchAsync(async (req, res) => {
        const data = await asistenciaService.listAttendance(req.query, req.user);
        response.success(res, data);
    }),

    // POST /api/asistencia
    registrar: catchAsync(async (req, res) => {
        const { fecha, asistencias: asistenciasList } = req.body;

        if (!fecha || !asistenciasList || !Array.isArray(asistenciasList)) {
            throw new AppError('Fecha y lista de asistencias son requeridas', 400);
        }

        await asistenciaService.registerAttendance(req.body, req.user);
        response.success(res, null, 'Asistencia registrada exitosamente');
    }),

    // GET /api/asistencia/historial/:jugadorId
    historial: catchAsync(async (req, res) => {
        const jugadorId = parseInt(req.params.jugadorId);
        const data = await asistenciaService.getHistory(jugadorId, req.user);
        
        if (!data) {
            throw new AppError('Jugador no encontrado', 404);
        }

        response.success(res, data);
    }),

    // GET /api/asistencia/por-fecha/:fecha
    porFecha: catchAsync(async (req, res) => {
        const fecha = req.params.fecha;
        const data = await asistenciaService.listAttendance({ ...req.query, fecha }, req.user);
        
        data.sort((a, b) => a.jugador.nombre.localeCompare(b.jugador.nombre));

        response.success(res, data);
    }),

    // DELETE /api/asistencia/:id
    eliminar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const success = await asistenciaService.deleteAttendance(id, req.user);
        
        if (success === null) {
            throw new AppError('Registro no encontrado', 404);
        }

        response.success(res, null, 'Registro eliminado');
    })
};

module.exports = asistenciaController;

const pagoService = require('../services/pagoService');
const catchAsync = require('../utils/catchAsync');
const response = require('../utils/response');
const AppError = require('../utils/AppError');

const pagoController = {
    // GET /pagos/page
    page: (req, res) => {
        res.sendFile('index.html', { root: './views/pagos' });
    },

    // GET /pagos/api - Listar pagos con filtros
    listar: catchAsync(async (req, res) => {
        const data = await pagoService.listPayments(req.query, req.user);
        response.success(res, data);
    }),

    // POST /pagos/api/generar
    generar: catchAsync(async (req, res) => {
        const { mes, anio } = req.body;

        if (!mes || !anio) {
            throw new AppError('Mes y año son requeridos', 400);
        }

        const result = await pagoService.generatePayments(req.body, req.user);
        response.success(res, result.data, result.message);
    }),

    // PUT /pagos/api/:id
    actualizar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const updated = await pagoService.updatePayment(id, req.body, req.user);
        
        if (!updated) {
            throw new AppError('Pago no encontrado', 404);
        }

        response.success(res, updated, `Pago ${req.body.estado === 'pagado' ? 'registrado' : 'actualizado'} exitosamente`);
    }),

    // PUT /pagos/api/masivo
    actualizarMasivo: catchAsync(async (req, res) => {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new AppError('Selecciona al menos un pago', 400);
        }

        await pagoService.bulkUpdatePayments(req.body, req.user);
        response.success(res, null, `${ids.length} pago(s) actualizado(s) exitosamente`);
    }),

    // DELETE /pagos/api/:id
    eliminar: catchAsync(async (req, res) => {
        const id = parseInt(req.params.id);
        const success = await pagoService.deletePayment(id, req.user);
        
        if (success === null) {
            throw new AppError('Pago no encontrado', 404);
        }

        response.success(res, null, 'Pago eliminado exitosamente');
    }),

    // GET /pagos/api/resumen
    resumen: catchAsync(async (req, res) => {
        const data = await pagoService.getSummary(req.query, req.user);
        response.success(res, data);
    }),

    // GET /pagos/api/jugador/:jugadorId
    historialJugador: catchAsync(async (req, res) => {
        const jugadorId = parseInt(req.params.jugadorId);
        const data = await pagoService.getPlayerHistory(jugadorId, req.user);
        response.success(res, data);
    })
};

module.exports = pagoController;

const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Page routes
router.get('/page', authMiddleware, pagoController.page);

// API routes
router.get('/api/resumen', authMiddleware, pagoController.resumen);
router.get('/api/jugador/:jugadorId', authMiddleware, pagoController.historialJugador);
router.get('/api', authMiddleware, pagoController.listar);
router.post('/api/generar', authMiddleware, pagoController.generar);
router.put('/api/masivo', authMiddleware, pagoController.actualizarMasivo);
router.put('/api/:id', authMiddleware, pagoController.actualizar);
router.delete('/api/:id', authMiddleware, pagoController.eliminar);

module.exports = router;

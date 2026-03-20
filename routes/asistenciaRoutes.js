const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Page route
router.get('/page', authMiddleware, asistenciaController.page);

// API routes
router.get('/api', authMiddleware, asistenciaController.listar);
router.post('/api', authMiddleware, asistenciaController.registrar);
router.get('/api/historial/:jugadorId', authMiddleware, asistenciaController.historial);
router.get('/api/por-fecha/:fecha', authMiddleware, asistenciaController.porFecha);
router.delete('/api/:id', authMiddleware, asistenciaController.eliminar);

module.exports = router;

const express = require('express');
const router = express.Router();
const torneoController = require('../controllers/torneoController');
const { authMiddleware } = require('../middleware/authMiddleware');
const path = require('path');

// Page routes
router.get('/page', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/torneos/index.html'));
});

// API routes
router.get('/api', authMiddleware, torneoController.listar);
router.get('/api/:id', authMiddleware, torneoController.obtener);
router.post('/api', authMiddleware, torneoController.crear);
router.put('/api/:id', authMiddleware, torneoController.actualizar);
router.delete('/api/:id', authMiddleware, torneoController.eliminar);

// Participation actions
router.post('/api/:id/participar', authMiddleware, torneoController.participar);
router.post('/api/:id/invitar', authMiddleware, torneoController.invitar);
router.put('/api/:id/participantes/:escuela_id', authMiddleware, torneoController.cambiarEstadoParticipante);

// Match management
const partidoController = require('../controllers/partidoController');
router.get('/api/:torneoId/partidos', authMiddleware, partidoController.listarPorTorneo);
router.get('/api/partidos/:id', authMiddleware, partidoController.obtener);
router.post('/api/:torneoId/partidos', authMiddleware, partidoController.crear);
router.put('/api/partidos/:id', authMiddleware, partidoController.actualizar);
router.delete('/api/partidos/:id', authMiddleware, partidoController.eliminar);

module.exports = router;

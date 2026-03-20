const express = require('express');
const router = express.Router();
const jugadorController = require('../controllers/jugadorController');
const { authMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Multer field configuration (max 5 files)
const uploadFields = upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'registro_civil', maxCount: 1 },
    { name: 'documento_acudiente', maxCount: 1 },
    { name: 'documento_extra1', maxCount: 1 },
    { name: 'documento_extra2', maxCount: 1 },
    { name: 'documento_extra3', maxCount: 1 },
    { name: 'documento_extra4', maxCount: 1 }
]);

// Page routes
router.get('/page', authMiddleware, jugadorController.page);
router.get('/nuevo', authMiddleware, jugadorController.nuevoPage);
router.get('/editar/:id', authMiddleware, jugadorController.editarPage);
router.get('/ficha/:id', authMiddleware, jugadorController.fichaPage);

// API routes
router.get('/api/estadisticas', authMiddleware, jugadorController.estadisticas);
router.get('/api', authMiddleware, jugadorController.listar);
router.get('/api/:id', authMiddleware, jugadorController.obtener);
router.post('/api', authMiddleware, uploadFields, jugadorController.crear);
router.put('/api/:id', authMiddleware, uploadFields, jugadorController.actualizar);
router.delete('/api/:id', authMiddleware, jugadorController.eliminar);

module.exports = router;

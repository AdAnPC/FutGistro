const express = require('express');
const router = express.Router();
const escuelaController = require('../controllers/escuelaController');
const { authMiddleware, isSuperAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Page route (only superadmin)
router.get('/page', authMiddleware, isSuperAdmin, escuelaController.page);

// Page for trainers and admins to edit THEIR school
router.get('/mi-escuela/page', authMiddleware, escuelaController.miEscuelaPage);

// API routes - listing available for all auth users (needed for player form selects)
router.get('/', authMiddleware, escuelaController.listar);
router.get('/mi-escuela/api', authMiddleware, escuelaController.obtenerMiEscuela);
router.put('/mi-escuela/api', authMiddleware, upload.single('logo'), escuelaController.actualizarMiEscuela);
router.get('/:id', authMiddleware, escuelaController.obtener);

// CRUD operations - only superadmin
router.post('/', authMiddleware, isSuperAdmin, upload.single('logo'), escuelaController.crear);
router.put('/:id', authMiddleware, isSuperAdmin, upload.single('logo'), escuelaController.actualizar);
router.delete('/:id', authMiddleware, isSuperAdmin, escuelaController.eliminar);

module.exports = router;

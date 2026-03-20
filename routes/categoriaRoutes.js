const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');

// Page route
router.get('/page', authMiddleware, categoriaController.page);

// API routes
router.get('/', authMiddleware, categoriaController.listar);
router.get('/:id', authMiddleware, categoriaController.obtener);
router.post('/', authMiddleware, categoriaController.crear);
router.put('/:id', authMiddleware, categoriaController.actualizar);
router.delete('/:id', authMiddleware, categoriaController.eliminar);

module.exports = router;

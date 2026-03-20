const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, isAdmin, isSuperAdmin, isGuest } = require('../middleware/authMiddleware');

// Public routes
router.get('/login', isGuest, authController.loginPage);
router.post('/login', authController.login);
router.get('/registro', authMiddleware, isAdmin, authController.registroPage);
router.post('/registro', authMiddleware, isAdmin, authController.registro);
router.get('/logout', authController.logout);

// Protected routes (superadmin only)
router.get('/usuarios/page', authMiddleware, isSuperAdmin, (req, res) => {
    res.sendFile('usuarios.html', { root: './views/auth' });
});
router.get('/usuarios', authMiddleware, isSuperAdmin, authController.listarUsuarios);
router.put('/usuarios/:id', authMiddleware, isSuperAdmin, authController.actualizarUsuario);
router.delete('/usuarios/:id', authMiddleware, isSuperAdmin, authController.eliminarUsuario);

// Get current user info
router.get('/me', authMiddleware, authController.me);

// Select school (for users without school)
router.get('/seleccionar-escuela', authMiddleware, (req, res) => {
    res.sendFile('seleccionar-escuela.html', { root: './views/auth' });
});
router.post('/seleccionar-escuela', authMiddleware, authController.seleccionarEscuela);

module.exports = router;

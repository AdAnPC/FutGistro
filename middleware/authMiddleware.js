const jwt = require('jsonwebtoken');

// Middleware to verify JWT token from session
const authMiddleware = (req, res, next) => {
    try {
        const token = req.session?.token;

        if (!token) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, message: 'Sesión expirada' });
            }
            return res.redirect('/auth/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.escuela_id) decoded.escuela_id = parseInt(decoded.escuela_id, 10);
        req.user = decoded;
        res.locals.user = decoded;
        next();
    } catch (error) {
        req.session.destroy();
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ success: false, message: 'Sesión expirada' });
        }
        return res.redirect('/auth/login');
    }
};

// Middleware to check if user is superadmin (dueño del software)
const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'superadmin') {
        return next();
    }
    // Return JSON for API/fetch requests, HTML for page navigation
    if (req.xhr || req.headers.accept?.includes('application/json') || req.path.includes('/api')) {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Solo el Super Administrador puede realizar esta acción.' });
    }
    return res.status(403).send(`
    <script>
      alert('Acceso denegado. Solo el Super Administrador puede realizar esta acción.');
      window.history.back();
    </script>
  `);
};

// Middleware to check if user is admin or superadmin
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.rol === 'administrador' || req.user.rol === 'superadmin')) {
        return next();
    }
    // Return JSON for API/fetch requests, HTML for page navigation
    if (req.xhr || req.headers.accept?.includes('application/json') || req.path.includes('/api')) {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Solo administradores pueden realizar esta acción.' });
    }
    return res.status(403).send(`
    <script>
      alert('Acceso denegado. Solo administradores pueden realizar esta acción.');
      window.history.back();
    </script>
  `);
};

// Middleware to check if user is already logged in
const isGuest = (req, res, next) => {
    const token = req.session?.token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/dashboard');
        } catch (e) {
            // Token invalid, continue
        }
    }
    next();
};

module.exports = { authMiddleware, isAdmin, isSuperAdmin, isGuest };

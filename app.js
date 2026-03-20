require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const os = require('os');
const { sequelize } = require('./models');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const MySQLStore = require('express-mysql-session')(session);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Session Storage Configuration (Supports Redis or MySQL)
let sessionStore;
if (process.env.REDIS_URL) {
    // REDIS Setup
    const { RedisStore } = require('connect-redis');
    const { createClient } = require('redis');
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch(err => console.error('❌ Error conectando a Redis:', err));
    sessionStore = new RedisStore({ client: redisClient, prefix: "futgistro:" });
    console.log('✅ Usando Redis para almacenamiento de sesiones');
} else {
    // MYSQL Setup (Default)
    const MySQLStore = require('express-mysql-session')(session);
    sessionStore = new MySQLStore({
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQLPASSWORD || '',
        database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'railway',
        clearExpired: true,
        checkExpirationInterval: 900000,
        expiration: 86400000
    });
    console.log('✅ Usando MySQL para almacenamiento de sesiones');
}

// Obtener IP local de la red (para logs de inicio)
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Production Middlewares
app.use(compression()); // Compress responses
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev')); // Better logging

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.disable('x-powered-by');

// Trust proxy for secure cookies (Needed for hostings like Railway/Render)
if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

// Limiter to prevent brute force
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Demasiadas solicitudes desde esta IP, por favor intente de nuevo más tarde.'
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: 'Demasiados intentos de acceso desde esta IP, por favor intente de nuevo en una hora.'
});

// Use global limiter
app.use(limiter);

// Payload limit Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session with Store
app.use(session({
    key: 'futgistro_session',
    secret: process.env.SESSION_SECRET || 'default_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 8 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: IS_PRODUCTION // Use secure cookies only in production (HTTPS)
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/authRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const jugadorRoutes = require('./routes/jugadorRoutes');
const asistenciaRoutes = require('./routes/asistenciaRoutes');
const escuelaRoutes = require('./routes/escuelaRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const { authMiddleware } = require('./middleware/authMiddleware');

// Auth routes (Apply stricter rate limiter to authentication endpoints)
app.use('/auth', authLimiter, authRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/jugadores', jugadorRoutes);
app.use('/asistencia', asistenciaRoutes);
app.use('/escuelas', escuelaRoutes);
app.use('/pagos', pagoRoutes);

// Dashboard
app.get('/dashboard', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Root redirect
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head><title>404</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-dark text-white d-flex align-items-center justify-content-center" style="min-height:100vh">
      <div class="text-center">
        <h1 class="display-1">404</h1>
        <p class="lead">Página no encontrada</p>
        <a href="/dashboard" class="btn btn-success">Ir al Dashboard</a>
      </div>
    </body>
    </html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// Database sync and start
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a MySQL establecida correctamente');

        // Sync models (Only use alter in development to avoid production data risk)
        if (!IS_PRODUCTION) {
            await sequelize.sync({ alter: true });
            console.log('✅ Modelos sincronizados con la base de datos (Development)');
        } else {
            console.log('✅ Saltando sincronización de modelos (Production Mode)');
        }

        const localIP = getLocalIP();

        app.listen(PORT, HOST, () => {
            console.log('');
            console.log('═══════════════════════════════════════════════════');
            console.log('  🚀 Servidor de futGistro iniciado');
            console.log('═══════════════════════════════════════════════════');
            console.log('');
            console.log('  📍 Acceso local (esta PC):');
            console.log(`     http://localhost:${PORT}`);
            console.log('');
            console.log('  📱 Acceso red local (otros dispositivos):');
            console.log(`     http://${localIP}:${PORT}`);
            console.log('');
            console.log('  📋 Dashboard: /dashboard');
            console.log('  🔐 Login:     /auth/login');
            console.log('');
            console.log('═══════════════════════════════════════════════════');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();

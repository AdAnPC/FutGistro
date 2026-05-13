require('dotenv').config();
const express = require('express');
const path = require('path');
const os = require('os');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const cron = require('node-cron');
const { generarBackup } = require('./services/backupService');

const { db } = require('./db');
const { usuarios } = require('./db/schema.js');
const { eq } = require('drizzle-orm');
const sessionConfig = require('./config/session');
const { authMiddleware } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Helpers
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

// Security & Optimization Middlewares
app.use(compression());
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.disable('x-powered-by');

if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

// Rate Limiters
const globalLimiter = rateLimit({
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

app.use(globalLimiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session
app.use(sessionConfig(IS_PRODUCTION));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const routes = {
    auth: require('./routes/authRoutes'),
    categorias: require('./routes/categoriaRoutes'),
    jugadores: require('./routes/jugadorRoutes'),
    asistencia: require('./routes/asistenciaRoutes'),
    escuelas: require('./routes/escuelaRoutes'),
    pagos: require('./routes/pagoRoutes'),
    torneos: require('./routes/torneoRoutes'),
    backup: require('./routes/backupRoutes')
};

app.use('/auth', authLimiter, routes.auth);
app.use('/categorias', routes.categorias);
app.use('/jugadores', routes.jugadores);
app.use('/asistencia', routes.asistencia);
app.use('/escuelas', routes.escuelas);
app.use('/pagos', routes.pagos);
app.use('/torneos', routes.torneos);
app.use('/backup', routes.backup);

app.get('/dashboard', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Error handling
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

app.use((err, req, res, next) => {
    console.error('❌ Error Handler:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';
    
    res.status(statusCode).json({
        success: false,
        message,
        stack: IS_PRODUCTION ? undefined : err.stack
    });
});

// Admin Seeder
async function seedInitialAdmin() {
    try {
        const adminEmail = 'superadmin@futgistro.com';
        const adminRecords = await db.select().from(usuarios).where(eq(usuarios.email, adminEmail));

        if (adminRecords.length === 0) {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('FG-SuperAdmin_2026_!#@_SecureAccess_99', 12);
            await db.insert(usuarios).values({
                nombre: 'Super Administrador',
                email: adminEmail,
                password: hashedPassword,
                rol: 'superadmin'
            });
            console.log('✅ Super Administrador inicial creado con éxito');
        }
    } catch (error) {
        console.error('⚠️ Error al crear usuario inicial:', error.message);
    }
}

// Start Server
async function startServer() {
    try {
        // Sync Database
        console.log('🔄 Sincronizando estructura de la base de datos...');
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('✅ Base de datos sincronizada con Drizzle');

        await seedInitialAdmin();

        // ―― Backup automático diario a las 2:00 AM ―――――――――――――――――――――――――――
        cron.schedule('0 2 * * *', async () => {
            console.log('📅 Ejecutando backup automático programado...');
            try {
                const resultado = await generarBackup('automatico');
                console.log(`✅ Backup automático completado: ${resultado.totalRegistros} registros, ${resultado.tamanoKb} KB`);
            } catch (err) {
                console.error('❌ Error en backup automático:', err.message);
            }
        }, {
            timezone: 'America/Bogota' // Hora Colombia
        });
        console.log('📅 Backup automático programado: todos los días a las 2:00 AM (Colombia)');

        const localIP = getLocalIP();
        app.listen(PORT, HOST, () => {
            console.log('\n🚀 Servidor de futGistro iniciado');
            console.log(`📍 Local: http://localhost:${PORT}`);
            console.log(`📱 Red:   http://${localIP}:${PORT}\n`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();

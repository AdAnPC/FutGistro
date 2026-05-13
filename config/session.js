const session = require('express-session');

const sessionConfig = (isProduction) => {
    let sessionStore;
    
    if (process.env.REDIS_URL) {
        const { RedisStore } = require('connect-redis');
        const { createClient } = require('redis');
        const redisClient = createClient({ url: process.env.REDIS_URL });
        
        redisClient.connect().catch(err => console.error('❌ Error conectando a Redis:', err));
        
        sessionStore = new RedisStore({ client: redisClient, prefix: "futgistro:" });
        console.log('✅ Usando Redis para almacenamiento de sesiones');
    } else {
        console.warn('⚠️ No se encontró REDIS_URL. Usando MemoryStore (No apto para producción)');
    }

    return session({
        key: 'futgistro_session',
        secret: process.env.SESSION_SECRET || 'default_secret',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 8 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax',
            secure: isProduction
        }
    });
};

module.exports = sessionConfig;

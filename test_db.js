require('dotenv').config();
const postgres = require('postgres');

async function test() {
    const client = postgres(process.env.DATABASE_URL);
    try {
        const result = await client`SELECT current_database() as db, version()`;
        console.log('✅ Conexión exitosa!');
        console.log('   Base de datos:', result[0].db);
    } catch (err) {
        console.error('❌ Error de conexión:', err.message);
        if (err.code) console.error('   Código:', err.code);
    } finally {
        await client.end();
    }
}
test();

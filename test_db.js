const postgres = require('postgres');
require('dotenv').config();

async function test() {
    try {
        console.log('Connecting to: ', process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/escuela_futbol');
        const sql = postgres(process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/escuela_futbol', { max: 1 });
        const result = await sql`SELECT 1 as val`;
        console.log('Connection successful!', result);
        await sql.end();
    } catch(e) {
        console.error('Connection failed!', e);
    }
}
test();

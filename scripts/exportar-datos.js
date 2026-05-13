/**
 * EXPORTAR DATOS - Script de respaldo
 * ------------------------------------
 * Exporta TODOS los datos de la base de datos actual a archivos JSON.
 * Úsalo ANTES de cambiar de base de datos para no perder nada.
 *
 * Uso: node scripts/exportar-datos.js
 *
 * Genera: backups/backup_YYYY-MM-DD_HH-MM-SS/
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('../db/schema');

async function exportarDatos() {
    const fechaHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const carpetaBackup = path.join(__dirname, '..', 'backups', `backup_${fechaHora}`);

    // Crear carpeta de backup
    fs.mkdirSync(carpetaBackup, { recursive: true });

    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client, { schema });

    // Verificar conexión antes de exportar
    console.log('🔌 Verificando conexión a la base de datos...');
    try {
        await client`SELECT 1`;
        console.log('✅ Conexión exitosa\n');
    } catch (err) {
        console.error('❌ No se pudo conectar a la base de datos.');
        console.error('   Error:', err.message);
        console.error('   URL usada:', process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':****@'));
        console.error('\n💡 Verifica que:');
        console.error('   1. PostgreSQL esté corriendo');
        console.error('   2. La contraseña en .env sea correcta');
        console.error('   3. La base de datos exista');
        await client.end();
        process.exit(1);
    }

    console.log('🔄 Iniciando exportación de datos...\n');

    const tablas = [
        { nombre: 'escuelas',             tabla: schema.escuelas },
        { nombre: 'usuarios',             tabla: schema.usuarios },
        { nombre: 'categorias',           tabla: schema.categorias },
        { nombre: 'jugadores',            tabla: schema.jugadores },
        { nombre: 'asistencias',          tabla: schema.asistencias },
        { nombre: 'pagos',                tabla: schema.pagos },
        { nombre: 'torneos',              tabla: schema.torneos },
        { nombre: 'torneo_participantes', tabla: schema.torneo_participantes },
        { nombre: 'partidos',             tabla: schema.partidos },
    ];

    const resumen = [];

    for (const { nombre, tabla } of tablas) {
        try {
            const datos = await db.select().from(tabla);
            const archivo = path.join(carpetaBackup, `${nombre}.json`);
            fs.writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf-8');
            console.log(`  ✅ ${nombre}: ${datos.length} registros exportados`);
            resumen.push({ tabla: nombre, registros: datos.length, archivo: `${nombre}.json` });
        } catch (err) {
            console.error(`  ❌ Error exportando ${nombre}:`, err.message);
            resumen.push({ tabla: nombre, registros: 0, error: err.message });
        }
    }

    // Guardar resumen
    const meta = {
        fecha_exportacion: new Date().toISOString(),
        base_de_datos: process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@'), // Ocultar contraseña
        tablas: resumen
    };
    fs.writeFileSync(path.join(carpetaBackup, '_resumen.json'), JSON.stringify(meta, null, 2));

    console.log(`\n✅ Exportación completa!`);
    console.log(`📁 Backup guardado en: ${carpetaBackup}\n`);

    await client.end();
}

exportarDatos().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});

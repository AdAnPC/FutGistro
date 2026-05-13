/**
 * IMPORTAR DATOS - Script de restauración
 * ----------------------------------------
 * Importa los datos exportados previamente a una nueva base de datos.
 * Úsalo DESPUÉS de configurar la nueva BD y aplicar las migraciones.
 *
 * Uso: node scripts/importar-datos.js backups/backup_2026-05-12_19-00-00
 *
 * IMPORTANTE: Asegúrate de que la nueva BD ya tenga las tablas creadas
 *             (ejecuta: npm run db:push) ANTES de importar.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('../db/schema');

// ─── Orden de importación (respeta llaves foráneas) ─────────────────────────
// Las tablas que no tienen dependencias van primero
const ORDEN_IMPORTACION = [
    { nombre: 'escuelas',             tabla: () => schema.escuelas },
    { nombre: 'categorias',           tabla: () => schema.categorias },
    { nombre: 'usuarios',             tabla: () => schema.usuarios },
    { nombre: 'jugadores',            tabla: () => schema.jugadores },
    { nombre: 'asistencias',          tabla: () => schema.asistencias },
    { nombre: 'pagos',                tabla: () => schema.pagos },
    { nombre: 'torneos',              tabla: () => schema.torneos },
    { nombre: 'torneo_participantes', tabla: () => schema.torneo_participantes },
    { nombre: 'partidos',             tabla: () => schema.partidos },
];

async function importarDatos() {
    // ── 1. Obtener carpeta de backup ────────────────────────────────────────
    const carpetaBackup = process.argv[2];

    if (!carpetaBackup) {
        console.error('❌ Debes indicar la carpeta del backup.');
        console.error('   Ejemplo: node scripts/importar-datos.js backups/backup_2026-05-12_19-00-00');
        process.exit(1);
    }

    const rutaBackup = path.isAbsolute(carpetaBackup)
        ? carpetaBackup
        : path.join(__dirname, '..', carpetaBackup);

    if (!fs.existsSync(rutaBackup)) {
        console.error(`❌ No existe la carpeta: ${rutaBackup}`);
        process.exit(1);
    }

    // ── 2. Mostrar resumen del backup ───────────────────────────────────────
    const resumenPath = path.join(rutaBackup, '_resumen.json');
    if (fs.existsSync(resumenPath)) {
        const resumen = JSON.parse(fs.readFileSync(resumenPath, 'utf-8'));
        console.log(`📦 Backup del: ${resumen.fecha_exportacion}`);
        console.log(`🗄️  BD origen:  ${resumen.base_de_datos}\n`);
    }

    // ── 3. Conectar a la nueva BD ───────────────────────────────────────────
    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client, { schema });

    console.log('🔄 Iniciando importación de datos...\n');

    let totalImportados = 0;
    let totalErrores = 0;

    for (const { nombre, tabla } of ORDEN_IMPORTACION) {
        const archivoJson = path.join(rutaBackup, `${nombre}.json`);

        if (!fs.existsSync(archivoJson)) {
            console.log(`  ⚠️  ${nombre}: archivo no encontrado, omitiendo...`);
            continue;
        }

        const datos = JSON.parse(fs.readFileSync(archivoJson, 'utf-8'));

        if (datos.length === 0) {
            console.log(`  ➖ ${nombre}: sin datos`);
            continue;
        }

        try {
            // Insertar en lotes de 50 para evitar timeouts
            const LOTE = 50;
            let insertados = 0;

            for (let i = 0; i < datos.length; i += LOTE) {
                const lote = datos.slice(i, i + LOTE);
                await db.insert(tabla()).values(lote).onConflictDoNothing();
                insertados += lote.length;
            }

            console.log(`  ✅ ${nombre}: ${insertados} registros importados`);
            totalImportados += insertados;
        } catch (err) {
            console.error(`  ❌ Error importando ${nombre}:`, err.message);
            totalErrores++;
        }
    }

    // ── 4. Resetear secuencias de IDs (para que el auto-increment siga bien) ─
    console.log('\n🔧 Reseteando secuencias de IDs...');
    const tablasSec = [
        'escuelas', 'usuarios', 'categorias', 'jugadores',
        'asistencias', 'pagos', 'torneos', 'torneo_participantes', 'partidos'
    ];

    for (const tbl of tablasSec) {
        try {
            await client`
                SELECT setval(
                    pg_get_serial_sequence(${tbl}, 'id'),
                    COALESCE((SELECT MAX(id) FROM ${client(tbl)}), 0) + 1,
                    false
                )
            `;
            console.log(`  ✅ Secuencia de ${tbl} reseteada`);
        } catch {
            // Ignorar si la tabla no tiene secuencia
        }
    }

    console.log(`\n✅ Importación completa!`);
    console.log(`   Registros importados: ${totalImportados}`);
    if (totalErrores > 0) {
        console.log(`   ⚠️  Tablas con error:  ${totalErrores}`);
    }

    await client.end();
}

importarDatos().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});

/**
 * RESTAURAR DATOS DESDE BACKUP JSON
 * ------------------------------------
 * Importa un archivo backup generado desde /backup/exportar
 * hacia la base de datos configurada en DATABASE_URL.
 *
 * USO (local apuntando a Render):
 *   $env:DATABASE_URL="postgres://user:pass@host/db"
 *   node scripts/restaurar-backup.js ./futgistro_backup_2026-05-12.json
 *
 * USO (local normal):
 *   node scripts/restaurar-backup.js ./futgistro_backup_2026-05-12.json
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('../db/schema');

// Orden respetando llaves foráneas
const ORDEN = [
    'escuelas',
    'categorias',
    'usuarios',
    'jugadores',
    'asistencias',
    'pagos',
    'torneos',
    'torneo_participantes',
    'partidos',
];

const TABLAS_SCHEMA = {
    escuelas:             schema.escuelas,
    categorias:           schema.categorias,
    usuarios:             schema.usuarios,
    jugadores:            schema.jugadores,
    asistencias:          schema.asistencias,
    pagos:                schema.pagos,
    torneos:              schema.torneos,
    torneo_participantes: schema.torneo_participantes,
    partidos:             schema.partidos,
};

async function restaurar() {
    // ── 1. Leer archivo de backup ────────────────────────────────────────────
    const archivoBackup = process.argv[2];
    if (!archivoBackup) {
        console.error('❌ Debes indicar el archivo de backup.');
        console.error('   Ejemplo: node scripts/restaurar-backup.js futgistro_backup_2026-05-12.json');
        process.exit(1);
    }

    const rutaArchivo = path.isAbsolute(archivoBackup)
        ? archivoBackup
        : path.join(process.cwd(), archivoBackup);

    if (!fs.existsSync(rutaArchivo)) {
        console.error(`❌ Archivo no encontrado: ${rutaArchivo}`);
        process.exit(1);
    }

    const backup = JSON.parse(fs.readFileSync(rutaArchivo, 'utf-8'));

    console.log('📦 Información del backup:');
    console.log(`   Fecha:           ${backup.fecha_exportacion}`);
    console.log(`   Exportado por:   ${backup.exportado_por}`);
    console.log(`   Total registros: ${backup.total_registros}`);
    console.log(`   BD destino:      ${process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':****@')}\n`);

    // ── 2. Conectar a la BD destino ──────────────────────────────────────────
    const client = postgres(process.env.DATABASE_URL, { ssl: process.env.NODE_ENV === 'production' ? 'require' : false });
    const db = drizzle(client, { schema });

    console.log('🔌 Verificando conexión...');
    try {
        await client`SELECT 1`;
        console.log('✅ Conexión exitosa\n');
    } catch (err) {
        console.error('❌ No se pudo conectar:', err.message);
        await client.end();
        process.exit(1);
    }

    // ── 3. Importar tabla por tabla ──────────────────────────────────────────
    console.log('🔄 Restaurando datos...\n');
    let totalRestaurados = 0;
    let totalErrores = 0;

    for (const nombre of ORDEN) {
        const datos = backup.datos?.[nombre];

        if (!datos || datos.length === 0) {
            console.log(`  ➖ ${nombre}: sin datos`);
            continue;
        }

        const tablaSchema = TABLAS_SCHEMA[nombre];
        if (!tablaSchema) {
            console.log(`  ⚠️  ${nombre}: tabla no encontrada en schema, omitiendo`);
            continue;
        }

        try {
            // Insertar en lotes de 50
            const LOTE = 50;
            let insertados = 0;
            for (let i = 0; i < datos.length; i += LOTE) {
                const lote = datos.slice(i, i + LOTE);
                await db.insert(tablaSchema).values(lote).onConflictDoNothing();
                insertados += lote.length;
            }
            console.log(`  ✅ ${nombre}: ${insertados} registros restaurados`);
            totalRestaurados += insertados;
        } catch (err) {
            console.error(`  ❌ Error en ${nombre}:`, err.message);
            totalErrores++;
        }
    }

    // ── 4. Resetear secuencias auto-increment ────────────────────────────────
    console.log('\n🔧 Actualizando secuencias de IDs...');
    for (const nombre of ORDEN) {
        try {
            await client.unsafe(`
                SELECT setval(
                    pg_get_serial_sequence('${nombre}', 'id'),
                    COALESCE((SELECT MAX(id) FROM "${nombre}"), 0) + 1,
                    false
                )
            `);
        } catch {
            // Ignorar si no aplica
        }
    }
    console.log('  ✅ Secuencias actualizadas\n');

    console.log('═══════════════════════════════');
    console.log(`✅ Restauración completa!`);
    console.log(`   Registros restaurados: ${totalRestaurados}`);
    if (totalErrores > 0) console.log(`   ⚠️  Tablas con error: ${totalErrores}`);
    console.log('═══════════════════════════════');

    await client.end();
}

restaurar().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});

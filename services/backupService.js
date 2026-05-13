/**
 * Servicio de Backup Automático
 * --------------------------------
 * Exporta todos los datos de la BD y los guarda en la tabla `system_backups`.
 * Diseñado para ejecutarse con node-cron en producción (Render).
 *
 * - Guarda los últimos 7 backups y borra los más antiguos automáticamente.
 * - Los backups se almacenan en la BD, no en el filesystem (seguro en Render).
 */

const { db } = require('../db');
const { desc, asc } = require('drizzle-orm');
const schema = require('../db/schema');

// Tablas a respaldar en orden
const TABLAS = [
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

const MAX_BACKUPS_GUARDADOS = 7; // Guardar solo los últimos 7

/**
 * Genera el backup completo de todos los datos.
 * @param {string} tipo - 'automatico' | 'manual'
 * @returns {Object} - { id, totalRegistros, tamanoKb }
 */
async function generarBackup(tipo = 'automatico') {
    // 1. Exportar todas las tablas
    const datos = {};
    let totalRegistros = 0;

    for (const { nombre, tabla } of TABLAS) {
        const filas = await db.select().from(tabla);
        datos[nombre] = filas;
        totalRegistros += filas.length;
    }

    // 2. Construir el objeto de backup
    const backupObj = {
        version: '1.0',
        fecha_exportacion: new Date().toISOString(),
        tipo,
        total_registros: totalRegistros,
        datos
    };

    const jsonStr = JSON.stringify(backupObj);
    const tamanoKb = Math.ceil(Buffer.byteLength(jsonStr, 'utf8') / 1024);

    // 3. Guardar en la BD
    const [registro] = await db.insert(schema.system_backups).values({
        datos: jsonStr,
        total_registros: totalRegistros,
        tamano_kb: tamanoKb,
        tipo
    }).returning({ id: schema.system_backups.id });

    // 4. Limpiar backups viejos (mantener solo los últimos MAX_BACKUPS_GUARDADOS)
    await limpiarBackupsAntiguos();

    console.log(`✅ Backup ${tipo} guardado | ID: ${registro.id} | ${totalRegistros} registros | ${tamanoKb} KB`);
    return { id: registro.id, totalRegistros, tamanoKb };
}

/**
 * Elimina backups viejos dejando solo los últimos MAX_BACKUPS_GUARDADOS.
 */
async function limpiarBackupsAntiguos() {
    const todos = await db
        .select({ id: schema.system_backups.id })
        .from(schema.system_backups)
        .orderBy(desc(schema.system_backups.createdAt));

    if (todos.length > MAX_BACKUPS_GUARDADOS) {
        const { notInArray } = require('drizzle-orm');
        const idsAMantener = todos.slice(0, MAX_BACKUPS_GUARDADOS).map(b => b.id);
        await db
            .delete(schema.system_backups)
            .where(notInArray(schema.system_backups.id, idsAMantener));
        console.log(`🗑️  Backups antiguos eliminados. Se mantienen los últimos ${MAX_BACKUPS_GUARDADOS}.`);
    }
}

/**
 * Obtiene la lista de backups guardados (sin los datos pesados).
 */
async function listarBackups() {
    return await db
        .select({
            id: schema.system_backups.id,
            total_registros: schema.system_backups.total_registros,
            tamano_kb: schema.system_backups.tamano_kb,
            tipo: schema.system_backups.tipo,
            createdAt: schema.system_backups.createdAt
        })
        .from(schema.system_backups)
        .orderBy(desc(schema.system_backups.createdAt));
}

/**
 * Obtiene un backup específico por ID.
 */
async function obtenerBackup(id) {
    const { eq } = require('drizzle-orm');
    const [backup] = await db
        .select()
        .from(schema.system_backups)
        .where(eq(schema.system_backups.id, parseInt(id)));
    return backup || null;
}

module.exports = { generarBackup, listarBackups, obtenerBackup };

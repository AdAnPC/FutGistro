/**
 * RUTA DE BACKUP - Solo para superadmin
 * ----------------------------------------
 * GET /backup/exportar  → Descarga todos los datos como JSON
 * GET /backup/           → Página HTML con botón de descarga
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware, isSuperAdmin } = require('../middleware/authMiddleware');
const schema = require('../db/schema');

// Todas las rutas requieren estar logueado como superadmin
router.use(authMiddleware, isSuperAdmin);

// ─── Página HTML con botón de descarga ──────────────────────────────────────
router.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Backup de Base de Datos - FutGistro</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                font-family: 'Segoe UI', sans-serif;
                background: #0f172a;
                color: #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
            }
            .card {
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 16px;
                padding: 40px;
                max-width: 480px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            }
            .icon { font-size: 56px; margin-bottom: 16px; }
            h1 { font-size: 22px; font-weight: 700; color: #f8fafc; margin-bottom: 8px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
            .btn {
                display: inline-block;
                background: linear-gradient(135deg, #22c55e, #16a34a);
                color: white;
                padding: 14px 32px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 600;
                font-size: 15px;
                transition: all 0.2s;
                border: none;
                cursor: pointer;
                width: 100%;
            }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(34,197,94,0.4); }
            .warning {
                background: #1a1a2e;
                border: 1px solid #f59e0b44;
                border-radius: 8px;
                padding: 12px;
                margin-top: 20px;
                font-size: 13px;
                color: #f59e0b;
            }
            #estado { margin-top: 16px; font-size: 13px; color: #64748b; }
            .back { display: block; margin-top: 20px; color: #64748b; font-size: 13px; text-decoration: none; }
            .back:hover { color: #94a3b8; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">🗄️</div>
            <h1>Backup de Base de Datos</h1>
            <p>Descarga todos los datos actuales de la base de datos en formato JSON.<br>
               Guarda el archivo en un lugar seguro antes de migrar.</p>

            <a href="/backup/exportar" class="btn" id="btnDescargar" onclick="mostrarEstado()">
                ⬇️ Descargar Backup Ahora
            </a>

            <div id="estado"></div>

            <div class="warning">
                ⚠️ Solo accesible para Super Administradores.<br>
                Guarda el archivo JSON en un lugar seguro.
            </div>

            <a href="/dashboard" class="back">← Volver al Dashboard</a>
        </div>

        <script>
            function mostrarEstado() {
                document.getElementById('estado').textContent = '⏳ Generando backup, espera...';
                setTimeout(() => {
                    document.getElementById('estado').textContent = '✅ Descarga iniciada. Revisa tu carpeta de descargas.';
                }, 2000);
            }
        </script>
    </body>
    </html>
    `);
});

// ─── Endpoint de exportación (descarga el JSON) ──────────────────────────────
router.get('/exportar', async (req, res) => {
    try {
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

        const backup = {
            version: '1.0',
            fecha_exportacion: new Date().toISOString(),
            exportado_por: req.user?.email || 'superadmin',
            datos: {}
        };

        for (const { nombre, tabla } of tablas) {
            const datos = await db.select().from(tabla);
            backup.datos[nombre] = datos;
        }

        // Contar registros totales
        const totalRegistros = Object.values(backup.datos)
            .reduce((sum, arr) => sum + arr.length, 0);
        backup.total_registros = totalRegistros;

        // Nombre del archivo con fecha
        const fecha = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `futgistro_backup_${fecha}.json`;

        // Enviar como descarga
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.json(backup);

        console.log(`✅ Backup exportado por ${req.user?.email} — ${totalRegistros} registros`);
    } catch (err) {
        console.error('❌ Error al exportar backup:', err);
        res.status(500).json({
            success: false,
            message: 'Error al generar el backup: ' + err.message
        });
    }
});

module.exports = router;

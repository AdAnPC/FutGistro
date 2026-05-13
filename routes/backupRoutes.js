/**
 * RUTAS DE BACKUP - Solo para superadmin
 * ----------------------------------------
 * GET /backup           → Página con historial de backups
 * GET /backup/exportar  → Genera backup AHORA y lo descarga
 * GET /backup/descargar/:id → Descarga un backup específico del historial
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { authMiddleware, isSuperAdmin } = require('../middleware/authMiddleware');
const { generarBackup, listarBackups, obtenerBackup } = require('../services/backupService');
const { db, client } = require('../db');
const schema = require('../db/schema');

// Todas las rutas requieren superadmin
router.use(authMiddleware, isSuperAdmin);

// ─── Página principal: historial de backups ──────────────────────────────────
router.get('/', async (req, res) => {
    let backups = [];
    let error = null;

    try {
        backups = await listarBackups();
    } catch (err) {
        error = 'No se pudo cargar el historial. La tabla puede no estar creada aún.';
        console.error('Error cargando backups:', err.message);
    }

    const filas = backups.map(b => {
        const fecha = new Date(b.createdAt).toLocaleString('es-CO', {
            dateStyle: 'medium', timeStyle: 'short'
        });
        const badge = b.tipo === 'automatico'
            ? `<span style="background:#1e40af;color:#93c5fd;padding:2px 8px;border-radius:99px;font-size:11px">🤖 Automático</span>`
            : `<span style="background:#14532d;color:#86efac;padding:2px 8px;border-radius:99px;font-size:11px">👤 Manual</span>`;

        return `
        <tr>
            <td>${b.id}</td>
            <td>${fecha}</td>
            <td>${badge}</td>
            <td>${b.total_registros.toLocaleString()}</td>
            <td>${b.tamano_kb} KB</td>
            <td>
                <a href="/backup/descargar/${b.id}" class="btn-dl">⬇️ Descargar</a>
            </td>
        </tr>`;
    }).join('');

    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Backup de Base de Datos - FutGistro</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 32px 16px; }
            .container { max-width: 860px; margin: 0 auto; }
            h1 { font-size: 24px; font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
            .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
            .top-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
            .btn-now {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                color: white; padding: 12px 24px; border-radius: 10px;
                text-decoration: none; font-weight: 600; font-size: 14px;
                display: inline-flex; align-items: center; gap: 8px;
                transition: all 0.2s; white-space: nowrap; border: none; cursor: pointer;
            }
            .btn-now:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(34,197,94,0.4); }
            
            .btn-upload {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white; padding: 12px 24px; border-radius: 10px;
                text-decoration: none; font-weight: 600; font-size: 14px;
                display: inline-flex; align-items: center; gap: 8px;
                transition: all 0.2s; white-space: nowrap; border: none; cursor: pointer;
            }
            .btn-upload:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }

            .info-box {
                background: #1e293b; border: 1px solid #334155; border-radius: 12px;
                padding: 16px 20px; margin-bottom: 24px; font-size: 13px; color: #94a3b8; line-height: 1.8;
            }
            .info-box strong { color: #e2e8f0; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #0f172a; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #64748b; text-align: left; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 14px 16px; font-size: 13px; border-top: 1px solid #1e293b; }
            tr:hover td { background: #162032; }
            .btn-dl {
                background: #1e3a5f; color: #60a5fa; padding: 6px 14px; border-radius: 6px;
                text-decoration: none; font-size: 12px; font-weight: 600; transition: all 0.2s;
            }
            .btn-dl:hover { background: #1d4ed8; color: white; }
            .empty { text-align: center; padding: 40px; color: #475569; }
            .error { background: #2d1515; border: 1px solid #7f1d1d; border-radius: 8px; padding: 12px 16px; color: #fca5a5; margin-bottom: 16px; font-size: 13px; }
            .back { display: inline-block; margin-top: 20px; color: #64748b; font-size: 13px; text-decoration: none; }
            .back:hover { color: #94a3b8; }
            .cron-badge { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 16px; font-size: 12px; color: #64748b; margin-bottom: 20px; }
            .cron-badge span { color: #22c55e; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="top-bar">
                <div>
                    <h1>🗄️ Backups de Base de Datos</h1>
                    <p class="subtitle">Historial de copias de seguridad automáticas y manuales</p>
                </div>
                <div style="display:flex; gap:12px;">
                    <a href="/backup/exportar" class="btn-now" id="btnNow" onclick="this.textContent='⏳ Generando...'">
                        ⬇️ Descargar Backup
                    </a>
                    <button class="btn-upload" onclick="document.getElementById('backupFile').click()">
                        ⬆️ Cargar Backup JSON
                    </button>
                    <input type="file" id="backupFile" accept=".json" style="display:none;" onchange="subirBackup(this)">
                </div>
            </div>

            <div id="uploadStatus" style="display:none; background:#1e3a8a; border:1px solid #3b82f6; border-radius:8px; padding:12px; margin-bottom:20px; font-size:14px; color:#bfdbfe; font-weight:600;">
                ⏳ Subiendo y restaurando backup... Esto puede tomar un minuto.
            </div>

            <div class="cron-badge">
                🤖 Backup automático programado: <span>Todos los días a las 2:00 AM</span> (hora del servidor) — se guardan los últimos 7
            </div>

            ${error ? `<div class="error">⚠️ ${error}</div>` : ''}

            <div class="card">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Registros</th>
                            <th>Tamaño</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filas || `<tr><td colspan="6" class="empty">Aún no hay backups guardados.<br>Haz clic en "Backup Manual Ahora" para crear el primero.</td></tr>`}
                    </tbody>
                </table>
            </div>

            <a href="/dashboard" class="back">← Volver al Dashboard</a>
        </div>
        
        <script>
            async function subirBackup(input) {
                if (!input.files || input.files.length === 0) return;
                
                const file = input.files[0];
                if (!confirm(\`¿Estás seguro de que quieres restaurar la base de datos usando el archivo "\${file.name}"?\\n\\nEsto agregará los registros del archivo a la base de datos actual.\`)) {
                    input.value = '';
                    return;
                }
                
                document.getElementById('uploadStatus').style.display = 'block';
                
                const formData = new FormData();
                formData.append('backupFile', file);
                
                try {
                    const res = await fetch('/backup/restaurar', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await res.json();
                    
                    if (data.success) {
                        alert('✅ Restauración completada con éxito. Se importaron ' + data.registros + ' registros.');
                        window.location.reload();
                    } else {
                        alert('❌ Error: ' + data.message);
                        document.getElementById('uploadStatus').style.display = 'none';
                    }
                } catch (err) {
                    alert('❌ Error de conexión al subir el archivo.');
                    document.getElementById('uploadStatus').style.display = 'none';
                }
                
                input.value = '';
            }
        </script>
    </body>
    </html>
    `);
});

// ─── Generar backup AHORA (manual) y descargarlo ─────────────────────────────
router.get('/exportar', async (req, res) => {
    try {
        // Generar y guardar en BD
        await generarBackup('manual');

        // Obtener el último guardado para descargarlo
        const lista = await listarBackups();
        const ultimo = lista[0];
        const completo = await obtenerBackup(ultimo.id);

        const fecha = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `futgistro_backup_${fecha}.json`;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.send(completo.datos);

        console.log(`📥 Backup manual descargado por ${req.user?.email}`);
    } catch (err) {
        console.error('❌ Error generando backup:', err);
        res.status(500).json({ success: false, message: 'Error: ' + err.message });
    }
});

// ─── Descargar un backup específico del historial ────────────────────────────
router.get('/descargar/:id', async (req, res) => {
    try {
        const backup = await obtenerBackup(req.params.id);

        if (!backup) {
            return res.status(404).json({ success: false, message: 'Backup no encontrado' });
        }

        const fechaObj = new Date(backup.createdAt);
        const fechaStr = fechaObj.toISOString().slice(0, 10);
        const nombreArchivo = `futgistro_backup_${fechaStr}_id${backup.id}.json`;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.send(backup.datos);

        console.log(`📥 Backup #${backup.id} descargado por ${req.user?.email}`);
    } catch (err) {
        console.error('❌ Error descargando backup:', err);
        res.status(500).json({ success: false, message: 'Error: ' + err.message });
    }
});

// ─── Restaurar un backup subiendo un archivo JSON ────────────────────────────
router.post('/restaurar', upload.single('backupFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se envió ningún archivo.' });
        }

        const backupData = JSON.parse(req.file.buffer.toString('utf-8'));
        
        if (!backupData.datos) {
            return res.status(400).json({ success: false, message: 'El archivo JSON no tiene el formato correcto.' });
        }

        const ORDEN = [
            'escuelas', 'categorias', 'usuarios', 'jugadores',
            'asistencias', 'pagos', 'torneos', 'torneo_participantes', 'partidos'
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

        let totalRestaurados = 0;



        // Importar datos
        for (const nombre of ORDEN) {
            const datos = backupData.datos[nombre];
            if (!datos || datos.length === 0) continue;
            
            const tablaSchema = TABLAS_SCHEMA[nombre];
            if (!tablaSchema) continue;

            const LOTE = 50;
            for (let i = 0; i < datos.length; i += LOTE) {
                const lote = datos.slice(i, i + LOTE).map(fila => {
                    const nuevaFila = { ...fila };
                    for (const key in nuevaFila) {
                        // Drizzle requires Date objects only for timestamp fields
                        if ((key === 'createdAt' || key === 'updatedAt' || key === 'created_at' || key === 'updated_at') && nuevaFila[key]) {
                            nuevaFila[key] = new Date(nuevaFila[key]);
                        }
                    }
                    return nuevaFila;
                });
                
                await db.insert(tablaSchema).values(lote).onConflictDoNothing();
                totalRestaurados += lote.length;
            }
        }

        // Resetear secuencias para que los nuevos IDs autoincrementables funcionen
        for (const nombre of ORDEN) {
            try {
                await client.unsafe(`
                    SELECT setval(
                        pg_get_serial_sequence('${nombre}', 'id'),
                        COALESCE((SELECT MAX(id) FROM "${nombre}"), 0) + 1,
                        false
                    )
                `);
            } catch (e) {
                // Ignorar tablas sin secuencias
            }
        }

        console.log(`✅ Restauración vía web completada por ${req.user?.email}: ${totalRestaurados} registros importados`);
        res.json({ success: true, registros: totalRestaurados });

    } catch (err) {
        console.error('❌ Error restaurando backup:', err);
        res.status(500).json({ success: false, message: 'Error procesando el archivo: ' + err.message });
    }
});

module.exports = router;

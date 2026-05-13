const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const driveService = {
    uploadFile: async (filePath, fileName, mimeType) => {
        try {
            let keyData;
            
            // 1. Intentar cargar desde el sistema de "Secret Files" de Render (RECOMENDADO)
            const renderSecretPath = '/etc/secrets/google-service-account.json';
            const localConfigPath = path.join(__dirname, '../config/google-service-account.json');

            if (fs.existsSync(renderSecretPath)) {
                console.log("✅ Cargando llave desde Secret Files de Render.");
                keyData = JSON.parse(fs.readFileSync(renderSecretPath, 'utf8'));
            } 
            // 2. Intentar cargar desde Variable de Entorno (Si no hay Secret File)
            else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
                console.log("✅ Usando variable de entorno (Render).");
                const rawValue = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
                try {
                    keyData = JSON.parse(rawValue);
                } catch (e) {
                    console.log("ℹ️ JSON normal falló. Intentando decodificar Base64...");
                    try {
                        const jsonString = Buffer.from(rawValue, 'base64').toString('utf8');
                        keyData = JSON.parse(jsonString);
                    } catch (e2) {
                        throw new Error(`Error fatal en GOOGLE_SERVICE_ACCOUNT_JSON: ${e.message}`);
                    }
                }
            } 
            // 3. Fallback a archivo local (Desarrollo)
            else if (fs.existsSync(localConfigPath)) {
                console.log(`✅ Usando archivo local en: ${localConfigPath}`);
                keyData = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
            } else {
                throw new Error('No se encontró la configuración de Google Drive en ninguna ubicación (Secret File, ENV o Local).');
            }

            // LIMPIEZA: Asegurarnos de que la private_key tenga saltos de línea reales
            const cleanKey = keyData.private_key.replace(/\\n/g, '\n');

            const auth = new google.auth.JWT(
                keyData.client_email,
                null,
                cleanKey,
                SCOPES
            );

            console.log(`🚀 Subiendo a Drive con cuenta: ${keyData.client_email}`);
            
            const drive = google.drive({ version: 'v3', auth });

            const fileMetadata = {
                name: fileName,
            };

            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath),
            };

            const response = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id',
            });

            const fileId = response.data.id;

            // Dar permisos de lectura a cualquiera con el link
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });

            // Retornar el link directo
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        } catch (error) {
            console.error('Error subiendo a Google Drive:', error);
            throw error;
        } finally {
            // Opcional: Borrar archivo local después de subir
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
};

module.exports = driveService;

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

            console.log(`🔍 Buscando credenciales en: ${renderSecretPath}`);
            
            if (fs.existsSync(renderSecretPath)) {
                console.log("✅ Cargando desde Secret Files de Render.");
                keyData = JSON.parse(fs.readFileSync(renderSecretPath, 'utf8'));
            } 
            else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
                console.log("✅ Usando variable de entorno (Render).");
                const rawValue = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
                try {
                    // Intentamos JSON normal
                    keyData = JSON.parse(rawValue);
                } catch (e) {
                    console.log("ℹ️ JSON normal falló. Intentando decodificar Base64...");
                    try {
                        const jsonString = Buffer.from(rawValue, 'base64').toString('utf8');
                        keyData = JSON.parse(jsonString);
                    } catch (e2) {
                        throw new Error(`Error en formato de GOOGLE_SERVICE_ACCOUNT_JSON: ${e.message}`);
                    }
                }
            } 
            else if (fs.existsSync(localConfigPath)) {
                console.log(`✅ Usando archivo local en: ${localConfigPath}`);
                keyData = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
            } 
            else {
                throw new Error('No se encontró configuración de Google Drive en Secret Files, ENV ni Local.');
            }

            // LIMPIEZA: Asegurarnos de que la private_key tenga saltos de línea reales
            const cleanKey = keyData.private_key.replace(/\\n/g, '\n');

            const auth = new google.auth.JWT(
                keyData.client_email,
                null,
                cleanKey,
                SCOPES
            );

            const drive = google.drive({ version: 'v3', auth });

            const fileMetadata = { name: fileName };
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

            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });

            return `https://lh3.googleusercontent.com/d/${fileId}`;
        } catch (error) {
            console.error('Error subiendo a Google Drive:', error);
            throw error;
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
};

module.exports = driveService;

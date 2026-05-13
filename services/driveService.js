const { google } = require('googleapis');
const fs = require('fs');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const driveService = {
    uploadFile: async (filePath, fileName, mimeType) => {
        try {
            let keyData;
            
            if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
                console.log("✅ Usando configuración de Google desde variable de entorno (Render).");
                keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            } else {
                console.log("ℹ️ Variable de entorno no encontrada. Buscando archivo local...");
                try {
                    keyData = require('../config/google-service-account.json');
                    console.log("✅ Usando archivo local: config/google-service-account.json");
                } catch (e) {
                    throw new Error('No se encontró GOOGLE_SERVICE_ACCOUNT_JSON en Render ni el archivo config/google-service-account.json en tu PC.');
                }
            }

            const auth = new google.auth.JWT(
                keyData.client_email,
                null,
                keyData.private_key,
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

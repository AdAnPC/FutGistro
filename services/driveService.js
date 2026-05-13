const { google } = require('googleapis');
const fs = require('fs');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const driveService = {
    uploadFile: async (filePath, fileName, mimeType) => {
        try {
            let keyData;
            try {
                keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            } catch (e) {
                // Fallback a archivo local si existe (para desarrollo local)
                try {
                    const path = require('path');
                    keyData = require('../config/google-service-account.json');
                } catch (e2) {
                    throw new Error('No se encontró la configuración de Google Service Account (Variable de entorno o archivo)');
                }
            }

            const auth = new google.auth.JWT(
                keyData.client_email,
                null,
                keyData.private_key,
                SCOPES
            );

            console.log(`🚀 Intentando subir a Drive con: ${keyData.client_email}`);
            
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

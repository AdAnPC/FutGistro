const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const KEYFILEPATH = path.join(__dirname, '../config/google-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const driveService = {
    uploadFile: async (filePath, fileName, mimeType) => {
        try {
            console.log(`🚀 Iniciando subida a Drive: ${fileName} (${mimeType})`);
            
            // Forzar obtención de cliente autenticado
            const authClient = await auth.getClient();
            const drive = google.drive({ version: 'v3', auth: authClient });

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

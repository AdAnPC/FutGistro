const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const KEYFILEPATH = path.join(__dirname, '../config/google-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

const driveService = {
    /**
     * Sube un archivo a Google Drive y lo hace público para lectura
     * @param {string} filePath Ruta local del archivo
     * @param {string} fileName Nombre con el que se guardará en Drive
     * @param {string} mimeType Tipo de archivo
     * @returns {Promise<string>} URL directa de la imagen (lh3)
     */
    uploadFile: async (filePath, fileName, mimeType) => {
        try {
            const fileMetadata = {
                name: fileName,
                // Si tienes un ID de carpeta, descomenta la línea de abajo
                // parents: ['ID_DE_TU_CARPETA_COMPARTIDA']
            };

            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath),
            };

            const response = await drive.files.create({
                resource: fileMetadata,
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

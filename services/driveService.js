const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const driveService = {
    uploadFile: async (filePath, fileName, mimeType) => {
        try {
            let keyData;
            
            if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
                console.log("✅ Usando variable de entorno (Render).");
                const rawValue = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
                let jsonString;

                try {
                    // Intento 1: ¿Es JSON normal?
                    keyData = JSON.parse(rawValue);
                    console.log("✅ JSON normal cargado correctamente.");
                } catch (e1) {
                    // Intento 2: ¿Es Base64?
                    console.log("ℹ️ JSON normal falló. Intentando decodificar Base64...");
                    try {
                        jsonString = Buffer.from(rawValue, 'base64').toString('utf8');
                        keyData = JSON.parse(jsonString);
                        console.log("✅ Base64 decodificado y JSON cargado con éxito.");
                    } catch (e2) {
                        console.error("❌ Ambos métodos fallaron (JSON y Base64).");
                        throw new Error(`Error en formato de GOOGLE_SERVICE_ACCOUNT_JSON: ${e1.message}`);
                    }
                }
            } else {
                const configPath = path.join(__dirname, '../config/google-service-account.json');
                console.log(`ℹ️ Buscando archivo en: ${configPath}`);
                
                if (fs.existsSync(configPath)) {
                    // Leemos el archivo y limpiamos posibles errores de escape
                    const rawContent = fs.readFileSync(configPath, 'utf8');
                    keyData = JSON.parse(rawContent);
                    console.log("✅ Archivo encontrado y cargado.");
                } else {
                    throw new Error(`No se encontró el archivo en: ${configPath}`);
                }
            }

            // LIMPIEZA DE EMERGENCIA: Si la llave tiene "\\n" literales, los convertimos a saltos de línea reales
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

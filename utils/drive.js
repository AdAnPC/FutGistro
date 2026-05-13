/**
 * Utilidad para procesar enlaces de Google Drive
 */

const processDriveUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    
    // Convertir links de Google Drive a links directos de imagen
    if (url.includes('drive.google.com')) {
        let fileId = '';
        
        // Caso 1: /file/d/ID/view
        const match1 = url.match(/\/file\/d\/([^\/?]+)/);
        if (match1) fileId = match1[1];
        
        // Caso 2: ?id=ID
        const match2 = url.match(/[?&]id=([^&]+)/);
        if (match2) fileId = match2[1];
        
        if (fileId) {
            // Usar el servidor de imágenes lh3 que es más fiable
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        }
    }
    
    return url;
};

module.exports = { processDriveUrl };

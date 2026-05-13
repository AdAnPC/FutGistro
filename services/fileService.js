const fs = require('fs');
const path = require('path');

const fileService = {
    /**
     * Deletes a file from the public directory
     * @param {string} relativePath - The relative path from the public folder
     */
    deleteFile: (relativePath) => {
        if (!relativePath) return;
        const fullPath = path.join(__dirname, '..', 'public', relativePath);
        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
            } catch (e) {
                console.error(`❌ Error eliminando archivo (${fullPath}):`, e);
            }
        }
    },

    /**
     * Saves a base64 encoded image to the firmas directory
     * @param {string} base64Data - The base64 encoded image string
     * @returns {Promise<string>} - The relative path of the saved file
     */
    saveSignature: async (base64Data) => {
        const matches = base64Data.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (!matches) throw new Error('Formato de firma inválido');

        const ext = matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');
        const filename = `firma-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
        const relativePath = path.join('/uploads', 'firmas', filename);
        const fullPath = path.join(__dirname, '..', 'public', relativePath);

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, buffer);
        return relativePath.replace(/\\/g, '/');
    }
};

module.exports = fileService;

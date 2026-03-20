const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const dirs = [
    path.join(__dirname, '..', 'public', 'uploads', 'fotos'),
    path.join(__dirname, '..', 'public', 'uploads', 'documentos'),
    path.join(__dirname, '..', 'public', 'uploads', 'firmas'),
    path.join(__dirname, '..', 'public', 'uploads', 'logos')
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = path.join(__dirname, '..', 'public', 'uploads');

        if (file.fieldname === 'foto') {
            uploadPath = path.join(uploadPath, 'fotos');
        } else if (file.fieldname === 'logo') {
            uploadPath = path.join(uploadPath, 'logos');
        } else if (['registro_civil', 'documento_acudiente', 'documento_extra1', 'documento_extra2', 'documento_extra3', 'documento_extra4'].includes(file.fieldname)) {
            uploadPath = path.join(uploadPath, 'documentos');
        } else if (file.fieldname === 'firma_padre') {
            uploadPath = path.join(uploadPath, 'firmas');
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP) y PDF'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
    fileFilter: fileFilter
});

module.exports = upload;

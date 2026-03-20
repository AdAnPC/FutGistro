const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const pwaTags = `
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#10b981">
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
`;

function processHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processHtmlFiles(fullPath);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes('manifest.json')) {
                // Insert PWA tags right before closing </head>
                content = content.replace('</head>', pwaTags + '</head>');
                fs.writeFileSync(fullPath, content);
                console.log('PWA Inyectado en:', fullPath.replace(__dirname, ''));
            }
        }
    }
}

// 1. Process HTMLs
processHtmlFiles(viewsDir);

// 2. Create Icon placeholders
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Minimalist placeholder transparent PNG pixel. You should replace these with logo images later.
const dummyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="; 
const buffer = Buffer.from(dummyPng, 'base64');
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), buffer);
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), buffer);

console.log('\n¡PWA instalada exitosamente en todas las vistas!');

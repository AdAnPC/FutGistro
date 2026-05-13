const { db } = require('../db');
const { escuelas, jugadores } = require('../db/schema.js');
const { eq, asc } = require('drizzle-orm');
const fileService = require('./fileService');

const escuelaService = {
    listSchools: async () => {
        const listaEscuelas = await db.query.escuelas.findMany({
            with: {
                jugadores: { columns: { id: true } }
            },
            orderBy: [asc(escuelas.nombre)]
        });

        return listaEscuelas.map(esc => ({
            ...esc,
            total_jugadores: esc.jugadores ? esc.jugadores.length : 0
        }));
    },

    getSchoolById: async (id) => {
        return await db.query.escuelas.findFirst({
            where: eq(escuelas.id, id),
            with: {
                jugadores: {
                    columns: { id: true, nombre: true, fecha_nacimiento: true, documento: true, foto: true }
                }
            }
        });
    },

    createSchool: async (data, file) => {
        const { nombre, direccion, telefono, director, email, precio_mensualidad, departamento, ciudad, logo_url } = data;

        const existe = await db.query.escuelas.findFirst({ where: eq(escuelas.nombre, nombre) });
        if (existe) {
            const err = new Error('Ya existe una escuela con este nombre');
            err.statusCode = 400;
            throw err;
        }

        const dataToCreate = {
            nombre,
            direccion: direccion || null,
            telefono: telefono || null,
            director: director || null,
            email: email ? email : null,
            precio_mensualidad: parseFloat(precio_mensualidad || 0).toFixed(2),
            departamento: departamento || null,
            ciudad: ciudad || null
        };
        
        if (file) {
            dataToCreate.logo = '/uploads/logos/' + file.filename;
        } else if (logo_url) {
            dataToCreate.logo = escuelaService.processLogoUrl(logo_url);
        }

        const result = await db.insert(escuelas).values(dataToCreate).returning();
        return result[0];
    },

    updateSchool: async (id, data, file) => {
        const { nombre, direccion, telefono, director, email, activa, precio_mensualidad, departamento, ciudad, logo_url } = data;
        const escuela = await db.query.escuelas.findFirst({ where: eq(escuelas.id, id) });

        if (!escuela) return null;

        if(nombre && nombre !== escuela.nombre) {
            const existe = await db.query.escuelas.findFirst({ where: eq(escuelas.nombre, nombre) });
            if(existe) {
                const err = new Error('Ya existe una escuela con este nombre');
                err.statusCode = 400;
                throw err;
            }
        }

        let dataToUpdate = {
            nombre,
            direccion: direccion || null,
            telefono: telefono || null,
            director: director || null,
            email: email ? email : null,
            activa: activa === 'true' || activa === true,
            precio_mensualidad: parseFloat(precio_mensualidad || 0).toFixed(2),
            departamento: departamento || null,
            ciudad: ciudad || null
        };
        
        if (file) {
            fileService.deleteFile(escuela.logo);
            dataToUpdate.logo = '/uploads/logos/' + file.filename;
        } else if (logo_url) {
            // Si hay una URL de logo y no se subió archivo, usamos la URL
            dataToUpdate.logo = escuelaService.processLogoUrl(logo_url);
        }

        const result = await db.update(escuelas).set(dataToUpdate).where(eq(escuelas.id, id)).returning();
        return result[0];
    },

    processLogoUrl: (url) => {
        if (!url) return null;
        
        // Convertir links de Google Drive a links directos de imagen
        if (url.includes('drive.google.com')) {
            let fileId = '';
            
            // Caso 1: /file/d/ID/view
            const match1 = url.match(/\/file\/d\/([^\/]+)/);
            if (match1) fileId = match1[1];
            
            // Caso 2: ?id=ID
            const match2 = url.match(/[?&]id=([^&]+)/);
            if (match2) fileId = match2[1];
            
            if (fileId) {
                return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
        }
        
        return url;
    },

    deleteSchool: async (id) => {
        const escuela = await db.query.escuelas.findFirst({
            where: eq(escuelas.id, id),
            with: { jugadores: { columns: { id: true } } }
        });

        if (!escuela) return null;

        if (escuela.jugadores && escuela.jugadores.length > 0) {
            const err = new Error(`No se puede eliminar. Hay ${escuela.jugadores.length} jugador(es) en esta escuela.`);
            err.statusCode = 400;
            throw err;
        }

        fileService.deleteFile(escuela.logo);

        await db.delete(escuelas).where(eq(escuelas.id, id));
        return true;
    }
};

module.exports = escuelaService;

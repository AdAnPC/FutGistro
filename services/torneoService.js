const { db } = require('../db');
const { torneos, escuelas, torneo_participantes } = require('../db/schema.js');
const { eq, and, desc } = require('drizzle-orm');

const torneoService = {
    listTournaments: async () => {
        return await db.query.torneos.findMany({
            with: {
                categoria: { columns: { nombre: true } },
                organizador: { columns: { nombre: true, ciudad: true } }
            },
            orderBy: [desc(torneos.fecha)]
        });
    },

    getTournamentById: async (id) => {
        const torneo = await db.query.torneos.findFirst({
            where: eq(torneos.id, id),
            with: {
                categoria: { columns: { nombre: true } },
                organizador: { columns: { nombre: true, ciudad: true, logo: true } },
                participantes: {
                    with: { escuela: { columns: { id: true, nombre: true, logo: true } } }
                }
            }
        });

        if (!torneo) return null;

        const escuelasEnCiudad = await db.query.escuelas.findMany({
            where: eq(escuelas.ciudad, torneo.ciudad),
            columns: { id: true, nombre: true, direccion: true, telefono: true, logo: true }
        });

        const parMap = {};
        if (torneo.participantes) {
            torneo.participantes.forEach(p => {
                parMap[p.escuela_id] = p.estado;
            });
        }

        const escuelasParticipantes = escuelasEnCiudad.map(esc => ({
            ...esc,
            estado_torneo: parMap[esc.id] || 'no_inscrito'
        }));

        return {
            ...torneo,
            escuelas_participantes: escuelasParticipantes
        };
    },

    createTournament: async (data, user) => {
        const torneoData = { ...data };
        if (!torneoData.organizador_id && user && user.escuela_id) {
            torneoData.organizador_id = user.escuela_id;
        }
        
        if(torneoData.fecha) {
           torneoData.fecha = new Date(torneoData.fecha).toISOString().split('T')[0];
        }
        if(torneoData.organizador_id) torneoData.organizador_id = parseInt(torneoData.organizador_id);
        if(torneoData.categoria_id) torneoData.categoria_id = parseInt(torneoData.categoria_id);
        
        const insertResult = await db.insert(torneos).values(torneoData).returning();
        const torneo = insertResult[0];
        
        if (torneo.organizador_id) {
            await db.insert(torneo_participantes).values({
                torneo_id: torneo.id,
                escuela_id: torneo.organizador_id,
                estado: 'confirmado'
            });
        }

        return torneo;
    },

    updateTournament: async (id, data) => {
        const torneo = await db.query.torneos.findFirst({ where: eq(torneos.id, id) });
        if (!torneo) return null;
        
        const torneoData = { ...data };
        if(torneoData.fecha) {
           torneoData.fecha = new Date(torneoData.fecha).toISOString().split('T')[0];
        }
        if(torneoData.organizador_id) torneoData.organizador_id = parseInt(torneoData.organizador_id);
        if(torneoData.categoria_id) torneoData.categoria_id = parseInt(torneoData.categoria_id);

        const updateResult = await db.update(torneos).set(torneoData).where(eq(torneos.id, id)).returning();
        return updateResult[0];
    },

    deleteTournament: async (id) => {
        const torneo = await db.query.torneos.findFirst({ where: eq(torneos.id, id) });
        if (!torneo) return null;
        
        await db.delete(torneo_participantes).where(eq(torneo_participantes.torneo_id, id));
        await db.delete(torneos).where(eq(torneos.id, id));
        return true;
    },

    participate: async (id, escuelaId) => {
        const existe = await db.query.torneo_participantes.findFirst({ 
            where: and(eq(torneo_participantes.torneo_id, id), eq(torneo_participantes.escuela_id, escuelaId)) 
        });
        
        if (existe) {
            const err = new Error('Ya tienes un registro en este torneo');
            err.statusCode = 400;
            throw err;
        }

        await db.insert(torneo_participantes).values({
            torneo_id: id,
            escuela_id: escuelaId,
            estado: 'pendiente'
        });

        return true;
    },

    invite: async (id, escuelaId) => {
        const existe = await db.query.torneo_participantes.findFirst({ 
            where: and(eq(torneo_participantes.torneo_id, id), eq(torneo_participantes.escuela_id, escuelaId)) 
        });
        if (existe) {
            const err = new Error('La escuela ya está en el torneo');
            err.statusCode = 400;
            throw err;
        }

        await db.insert(torneo_participantes).values({
            torneo_id: id,
            escuela_id: escuelaId,
            estado: 'invitado'
        });

        return true;
    },

    updateParticipantStatus: async (id, escuelaId, status) => {
        const part = await db.query.torneo_participantes.findFirst({ 
            where: and(eq(torneo_participantes.torneo_id, id), eq(torneo_participantes.escuela_id, escuelaId)) 
        });
        
        if (!part) return null;

        await db.update(torneo_participantes).set({ estado: status }).where(eq(torneo_participantes.id, part.id));
        return true;
    }
};

module.exports = torneoService;

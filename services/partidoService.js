const { db } = require('../db');
const { partidos } = require('../db/schema.js');
const { eq, asc } = require('drizzle-orm');

const partidoService = {
    listByTournament: async (torneoId) => {
        return await db.query.partidos.findMany({
            where: eq(partidos.torneo_id, torneoId),
            with: {
                escuela_local: { columns: { id: true, nombre: true, logo: true } },
                escuela_visitante: { columns: { id: true, nombre: true, logo: true } }
            },
            orderBy: [asc(partidos.fecha_partido), asc(partidos.hora)]
        });
    },

    getMatchById: async (id) => {
        return await db.query.partidos.findFirst({ where: eq(partidos.id, id) });
    },

    createMatch: async (data) => {
        const matchData = { ...data };
        if(matchData.torneo_id) matchData.torneo_id = parseInt(matchData.torneo_id);
        if(matchData.escuela_local_id) matchData.escuela_local_id = parseInt(matchData.escuela_local_id);
        if(matchData.escuela_visitante_id) matchData.escuela_visitante_id = parseInt(matchData.escuela_visitante_id);
        if(matchData.goles_local) matchData.goles_local = parseInt(matchData.goles_local);
        if(matchData.goles_visitante) matchData.goles_visitante = parseInt(matchData.goles_visitante);
        if(matchData.fecha_partido) matchData.fecha_partido = new Date(matchData.fecha_partido).toISOString().split('T')[0];

        const insertResult = await db.insert(partidos).values(matchData).returning();
        return insertResult[0];
    },

    updateMatch: async (id, data) => {
        const match = await db.query.partidos.findFirst({ where: eq(partidos.id, id) });
        if (!match) return null;

        const matchData = { ...data };
        if(matchData.torneo_id) matchData.torneo_id = parseInt(matchData.torneo_id);
        if(matchData.escuela_local_id) matchData.escuela_local_id = parseInt(matchData.escuela_local_id);
        if(matchData.escuela_visitante_id) matchData.escuela_visitante_id = parseInt(matchData.escuela_visitante_id);
        if(matchData.goles_local) matchData.goles_local = parseInt(matchData.goles_local);
        if(matchData.goles_visitante) matchData.goles_visitante = parseInt(matchData.goles_visitante);
        if(matchData.fecha_partido) matchData.fecha_partido = new Date(matchData.fecha_partido).toISOString().split('T')[0];

        const updateResult = await db.update(partidos).set(matchData).where(eq(partidos.id, id)).returning();
        return updateResult[0];
    },

    deleteMatch: async (id) => {
        const match = await db.query.partidos.findFirst({ where: eq(partidos.id, id) });
        if (!match) return null;

        await db.delete(partidos).where(eq(partidos.id, id));
        return true;
    }
};

module.exports = partidoService;

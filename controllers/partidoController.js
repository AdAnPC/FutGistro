const { db } = require('../db');
const { partidos, escuelas, torneos } = require('../db/schema.js');
const { eq, asc } = require('drizzle-orm');

const partidoController = {
    listarPorTorneo: async (req, res) => {
        try {
            const torneoId = parseInt(req.params.torneoId);
            const listaPartidos = await db.query.partidos.findMany({
                where: eq(partidos.torneo_id, torneoId),
                with: {
                    escuela_local: { columns: { id: true, nombre: true, logo: true } },
                    escuela_visitante: { columns: { id: true, nombre: true, logo: true } }
                },
                orderBy: [asc(partidos.fecha_partido), asc(partidos.hora)]
            });
            res.json({ success: true, data: listaPartidos });
        } catch (error) {
            console.error('Error listando partidos:', error);
            res.status(500).json({ success: false, message: 'Error al obtener los partidos' });
        }
    },

    obtener: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const partido = await db.query.partidos.findFirst({ where: eq(partidos.id, id) });
            if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
            res.json({ success: true, data: partido });
        } catch (error) {
            console.error('Error al obtener partido:', error);
            res.status(500).json({ success: false, message: 'Error al obtener partido' });
        }
    },

    crear: async (req, res) => {
        try {
            const data = { ...req.body };
            if(data.torneo_id) data.torneo_id = parseInt(data.torneo_id);
            if(data.escuela_local_id) data.escuela_local_id = parseInt(data.escuela_local_id);
            if(data.escuela_visitante_id) data.escuela_visitante_id = parseInt(data.escuela_visitante_id);
            if(data.goles_local) data.goles_local = parseInt(data.goles_local);
            if(data.goles_visitante) data.goles_visitante = parseInt(data.goles_visitante);
            if(data.fecha_partido) data.fecha_partido = new Date(data.fecha_partido).toISOString().split('T')[0];

            const insertResult = await db.insert(partidos).values(data).returning();
            res.json({ success: true, data: insertResult[0], message: 'Partido programado exitosamente' });
        } catch (error) {
            console.error('Error creando partido:', error);
            res.status(500).json({ success: false, message: 'Error al programar el partido' });
        }
    },

    actualizar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const partido = await db.query.partidos.findFirst({ where: eq(partidos.id, id) });
            if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

            const data = { ...req.body };
            if(data.torneo_id) data.torneo_id = parseInt(data.torneo_id);
            if(data.escuela_local_id) data.escuela_local_id = parseInt(data.escuela_local_id);
            if(data.escuela_visitante_id) data.escuela_visitante_id = parseInt(data.escuela_visitante_id);
            if(data.goles_local) data.goles_local = parseInt(data.goles_local);
            if(data.goles_visitante) data.goles_visitante = parseInt(data.goles_visitante);
            if(data.fecha_partido) data.fecha_partido = new Date(data.fecha_partido).toISOString().split('T')[0];

            const updateResult = await db.update(partidos).set(data).where(eq(partidos.id, id)).returning();
            res.json({ success: true, data: updateResult[0], message: 'Partido actualizado correctamente' });
        } catch (error) {
            console.error('Error actualizando partido:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar el partido' });
        }
    },

    eliminar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const partido = await db.query.partidos.findFirst({ where: eq(partidos.id, id) });
            if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

            await db.delete(partidos).where(eq(partidos.id, id));
            res.json({ success: true, message: 'Partido eliminado correctamente' });
        } catch (error) {
            console.error('Error eliminando partido:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar el partido' });
        }
    }
};

module.exports = partidoController;

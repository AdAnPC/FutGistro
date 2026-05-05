const { db } = require('../db');
const { torneos, escuelas, categorias, torneo_participantes } = require('../db/schema.js');
const { eq, desc, and } = require('drizzle-orm');

const torneoController = {
    // Listar todos los torneos
    listar: async (req, res) => {
        try {
            const listaTorneos = await db.query.torneos.findMany({
                with: {
                    categoria: { columns: { nombre: true } },
                    organizador: { columns: { nombre: true, ciudad: true } }
                },
                orderBy: [desc(torneos.fecha)]
            });
            res.json({ success: true, data: listaTorneos });
        } catch (error) {
            console.error('Error en listar torneos:', error);
            res.status(500).json({ success: false, message: 'Error al listar torneos' });
        }
    },

    // Obtener detalle de un torneo y escuelas de la misma ciudad con sus estados
    obtener: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
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

            if (!torneo) {
                return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
            }

            // Escuelas de la ciudad del torneo
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

            res.json({
                success: true,
                data: {
                    ...torneo,
                    escuelas_participantes: escuelasParticipantes
                }
            });
        } catch (error) {
            console.error('Error en obtener torneo:', error);
            res.status(500).json({ success: false, message: 'Error al obtener detalles del torneo' });
        }
    },

    crear: async (req, res) => {
        try {
            const data = { ...req.body };
            if (!data.organizador_id && req.user && req.user.escuela_id) {
                data.organizador_id = req.user.escuela_id;
            }
            
            // Format dates
            if(data.fecha) {
               data.fecha = new Date(data.fecha).toISOString().split('T')[0];
            }
            if(data.organizador_id) data.organizador_id = parseInt(data.organizador_id);
            if(data.categoria_id) data.categoria_id = parseInt(data.categoria_id);
            
            const insertResult = await db.insert(torneos).values(data).returning();
            const torneo = insertResult[0];
            
            // El organizador participa automáticamente
            if (torneo.organizador_id) {
                await db.insert(torneo_participantes).values({
                    torneo_id: torneo.id,
                    escuela_id: torneo.organizador_id,
                    estado: 'confirmado'
                });
            }

            res.json({ success: true, data: torneo, message: 'Torneo creado exitosamente' });
        } catch (error) {
            console.error('Error en crear torneo:', error);
            res.status(500).json({ success: false, message: 'Error al crear torneo' });
        }
    },

    actualizar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const torneo = await db.query.torneos.findFirst({ where: eq(torneos.id, id) });
            if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
            
            const data = { ...req.body };
            if(data.fecha) {
               data.fecha = new Date(data.fecha).toISOString().split('T')[0];
            }
            if(data.organizador_id) data.organizador_id = parseInt(data.organizador_id);
            if(data.categoria_id) data.categoria_id = parseInt(data.categoria_id);

            const updateResult = await db.update(torneos).set(data).where(eq(torneos.id, id)).returning();
            res.json({ success: true, data: updateResult[0], message: 'Torneo actualizado exitosamente' });
        } catch (error) {
            console.error('Error en actualizar torneo:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar torneo' });
        }
    },

    eliminar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const torneo = await db.query.torneos.findFirst({ where: eq(torneos.id, id) });
            if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
            
            // Delete participants first (cascade might be missing if not configured in DB directly)
            await db.delete(torneo_participantes).where(eq(torneo_participantes.torneo_id, id));
            
            await db.delete(torneos).where(eq(torneos.id, id));
            res.json({ success: true, message: 'Torneo eliminado exitosamente' });
        } catch (error) {
            console.error('Error en eliminar torneo:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar torneo' });
        }
    },

    // Acciones de participación
    participar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const escuela_id = req.user.escuela_id;
            if (!escuela_id) return res.status(400).json({ success: false, message: 'Debes pertenecer a una escuela' });

            const existe = await db.query.torneo_participantes.findFirst({ 
                where: and(eq(torneo_participantes.torneo_id, id), eq(torneo_participantes.escuela_id, escuela_id)) 
            });
            
            if (existe) return res.status(400).json({ success: false, message: 'Ya tienes un registro en este torneo' });

            await db.insert(torneo_participantes).values({
                torneo_id: id,
                escuela_id,
                estado: 'pendiente'
            });

            res.json({ success: true, message: 'Inscripción enviada exitosamente' });
        } catch (error) {
            console.error('Error al inscribirse:', error);
            res.status(500).json({ success: false, message: 'Error al inscribirse' });
        }
    },

    invitar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const escuela_id = parseInt(req.body.escuela_id);

            const existe = await db.query.torneo_participantes.findFirst({ 
                where: and(eq(torneo_participantes.torneo_id, id), eq(torneo_participantes.escuela_id, escuela_id)) 
            });
            if (existe) return res.status(400).json({ success: false, message: 'La escuela ya está en el torneo' });

            await db.insert(torneo_participantes).values({
                torneo_id: id,
                escuela_id,
                estado: 'invitado'
            });

            res.json({ success: true, message: 'Invitación enviada' });
        } catch (error) {
            console.error('Error al enviar invitación:', error);
            res.status(500).json({ success: false, message: 'Error al enviar invitación' });
        }
    },

    cambiarEstadoParticipante: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const escuela_id = parseInt(req.params.escuela_id);
            const { estado } = req.body;

            const part = await db.query.torneo_participantes.findFirst({ 
                where: and(eq(torneo_participantes.torneo_id, id), eq(torneo_participantes.escuela_id, escuela_id)) 
            });
            
            if (!part) return res.status(404).json({ success: false, message: 'Registro no encontrado' });

            await db.update(torneo_participantes).set({ estado }).where(eq(torneo_participantes.id, part.id));
            res.json({ success: true, message: 'Estado actualizado' });
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar estado' });
        }
    }
};

module.exports = torneoController;

const { Torneo, Escuela, Categoria, TorneoParticipante } = require('../models');

const torneoController = {
    // Listar todos los torneos
    listar: async (req, res) => {
        try {
            const torneos = await Torneo.findAll({
                include: [
                    { model: Categoria, as: 'categoria', attributes: ['nombre'] },
                    { model: Escuela, as: 'organizador', attributes: ['nombre', 'ciudad'] }
                ],
                order: [['fecha', 'DESC']]
            });
            res.json({ success: true, data: torneos });
        } catch (error) {
            console.error('Error en listar torneos:', error);
            res.status(500).json({ success: false, message: 'Error al listar torneos' });
        }
    },

    // Obtener detalle de un torneo y escuelas de la misma ciudad con sus estados
    obtener: async (req, res) => {
        try {
            const torneo = await Torneo.findByPk(req.params.id, {
                include: [
                    { model: Categoria, as: 'categoria', attributes: ['nombre'] },
                    { model: Escuela, as: 'organizador', attributes: ['nombre', 'ciudad', 'logo'] },
                    { 
                        model: TorneoParticipante, 
                        as: 'participantes',
                        include: [{ model: Escuela, as: 'escuela', attributes: ['id', 'nombre', 'logo'] }]
                    }
                ]
            });

            if (!torneo) {
                return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
            }

            // Según el requisito: "torneo por ciudad con todas las escuelas de esa ciudad"
            const escuelasEnCiudad = await Escuela.findAll({
                where: { ciudad: torneo.ciudad },
                attributes: ['id', 'nombre', 'direccion', 'telefono', 'logo']
            });

            // Mapear escuelas de la ciudad con su estado en este torneo
            const parMap = {};
            torneo.participantes.forEach(p => {
                parMap[p.escuela_id] = p.estado;
            });

            const escuelasParticipantes = escuelasEnCiudad.map(esc => ({
                ...esc.toJSON(),
                estado_torneo: parMap[esc.id] || 'no_inscrito'
            }));

            res.json({
                success: true,
                data: {
                    ...torneo.toJSON(),
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
            const data = req.body;
            if (!data.organizador_id && req.user && req.user.escuela_id) {
                data.organizador_id = req.user.escuela_id;
            }
            
            const torneo = await Torneo.create(data);
            
            // El organizador participa automáticamente
            if (torneo.organizador_id) {
                await TorneoParticipante.create({
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
            const torneo = await Torneo.findByPk(req.params.id);
            if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
            
            await torneo.update(req.body);
            res.json({ success: true, data: torneo, message: 'Torneo actualizado exitosamente' });
        } catch (error) {
            console.error('Error en actualizar torneo:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar torneo' });
        }
    },

    eliminar: async (req, res) => {
        try {
            const torneo = await Torneo.findByPk(req.params.id);
            if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
            
            await torneo.destroy();
            res.json({ success: true, message: 'Torneo eliminado exitosamente' });
        } catch (error) {
            console.error('Error en eliminar torneo:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar torneo' });
        }
    },

    // Acciones de participación
    participar: async (req, res) => {
        try {
            const { id } = req.params;
            const escuela_id = req.user.escuela_id;
            if (!escuela_id) return res.status(400).json({ success: false, message: 'Debes pertenecer a una escuela' });

            const existe = await TorneoParticipante.findOne({ where: { torneo_id: id, escuela_id } });
            if (existe) return res.status(400).json({ success: false, message: 'Ya tienes un registro en este torneo' });

            await TorneoParticipante.create({
                torneo_id: id,
                escuela_id,
                estado: 'pendiente'
            });

            res.json({ success: true, message: 'Inscripción enviada exitosamente' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al inscribirse' });
        }
    },

    invitar: async (req, res) => {
        try {
            const { id } = req.params;
            const { escuela_id } = req.body;

            const existe = await TorneoParticipante.findOne({ where: { torneo_id: id, escuela_id } });
            if (existe) return res.status(400).json({ success: false, message: 'La escuela ya está en el torneo' });

            await TorneoParticipante.create({
                torneo_id: id,
                escuela_id,
                estado: 'invitado'
            });

            res.json({ success: true, message: 'Invitación enviada' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al enviar invitación' });
        }
    },

    cambiarEstadoParticipante: async (req, res) => {
        try {
            const { id, escuela_id } = req.params;
            const { estado } = req.body;

            const part = await TorneoParticipante.findOne({ where: { torneo_id: id, escuela_id } });
            if (!part) return res.status(404).json({ success: false, message: 'Registro no encontrado' });

            await part.update({ estado });
            res.json({ success: true, message: 'Estado actualizado' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al actualizar estado' });
        }
    }
};

module.exports = torneoController;

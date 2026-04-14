const { Partido, Escuela, Torneo } = require('../models');

const partidoController = {
    listarPorTorneo: async (req, res) => {
        try {
            const { torneoId } = req.params;
            const partidos = await Partido.findAll({
                where: { torneo_id: torneoId },
                include: [
                    { model: Escuela, as: 'escuela_local', attributes: ['id', 'nombre', 'logo'] },
                    { model: Escuela, as: 'escuela_visitante', attributes: ['id', 'nombre', 'logo'] }
                ],
                order: [['fecha_partido', 'ASC'], ['hora', 'ASC']]
            });
            res.json({ success: true, data: partidos });
        } catch (error) {
            console.error('Error listando partidos:', error);
            res.status(500).json({ success: false, message: 'Error al obtener los partidos' });
        }
    },

    obtener: async (req, res) => {
        try {
            const { id } = req.params;
            const partido = await Partido.findByPk(id);
            if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
            res.json({ success: true, data: partido });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al obtener partido' });
        }
    },

    crear: async (req, res) => {
        try {
            const partido = await Partido.create(req.body);
            res.json({ success: true, data: partido, message: 'Partido programado exitosamente' });
        } catch (error) {
            console.error('Error creando partido:', error);
            res.status(500).json({ success: false, message: 'Error al programar el partido' });
        }
    },

    actualizar: async (req, res) => {
        try {
            const { id } = req.params;
            const partido = await Partido.findByPk(id);
            if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

            await partido.update(req.body);
            res.json({ success: true, data: partido, message: 'Partido actualizado correctamente' });
        } catch (error) {
            console.error('Error actualizando partido:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar el partido' });
        }
    },

    eliminar: async (req, res) => {
        try {
            const { id } = req.params;
            const partido = await Partido.findByPk(id);
            if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

            await partido.destroy();
            res.json({ success: true, message: 'Partido eliminado correctamente' });
        } catch (error) {
            console.error('Error eliminando partido:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar el partido' });
        }
    }
};

module.exports = partidoController;

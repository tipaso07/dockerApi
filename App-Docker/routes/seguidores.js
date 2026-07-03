const { Router } = require('express');
const Follow = require('../models/Follow');
const Notificacion = require('../models/Notificacion');
const Usuario = require('../models/Usuario');
const { verificarToken } = require('../middleware/auth');

const router = Router();

router.post('/:id/seguir', verificarToken, async (req, res) => {
  try {
    const seguidoId = req.params.id;
    const seguidorId = req.usuario.id;

    if (seguidoId === seguidorId) {
      return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
    }

    const usuarioSeguido = await Usuario.findById(seguidoId);
    if (!usuarioSeguido) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const followExistente = await Follow.findOne({ seguidor: seguidorId, seguido: seguidoId });

    if (followExistente) {
      await Follow.findByIdAndDelete(followExistente._id);
      return res.json({ mensaje: 'Dejaste de seguir a este usuario', siguiendo: false });
    } else {
      await Follow.create({ seguidor: seguidorId, seguido: seguidoId });

      await Notificacion.create({
        usuarioId: seguidoId,
        tipo: 'seguidor',
        mensaje: `${req.usuario.nombre} empezó a seguirte`,
        referenciaId: seguidorId
      });

      return res.json({ mensaje: 'Ahora sigues a este usuario', siguiendo: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/seguidores', async (req, res) => {
  try {
    const follows = await Follow.find({ seguido: req.params.id })
      .populate('seguidor', 'nombre email avatar bio')
      .sort({ fecha: -1 });
    const seguidores = follows.map(f => f.seguidor);
    res.json(seguidores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/siguiendo', async (req, res) => {
  try {
    const follows = await Follow.find({ seguidor: req.params.id })
      .populate('seguido', 'nombre email avatar bio')
      .sort({ fecha: -1 });
    const siguiendo = follows.map(f => f.seguido);
    res.json(siguiendo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/estado', verificarToken, async (req, res) => {
  try {
    const follow = await Follow.findOne({ seguidor: req.usuario.id, seguido: req.params.id });
    res.json({ siguiendo: !!follow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

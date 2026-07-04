const { Router } = require('express');
const Notificacion = require('../models/Notificacion');
const { verificarToken } = require('../middleware/auth');

const router = Router();

router.get('/', verificarToken, async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({ usuarioId: req.usuario.id })
      .sort({ fecha: -1 })
      .limit(50);
    const noLeidas = await Notificacion.countDocuments({ usuarioId: req.usuario.id, leido: false });
    res.json({ notificaciones, noLeidas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/leer', verificarToken, async (req, res) => {
  try {
    await Notificacion.findByIdAndUpdate(req.params.id, { leido: true });
    res.json({ mensaje: 'Marcada como leída' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/leer-todas', verificarToken, async (req, res) => {
  try {
    await Notificacion.updateMany({ usuarioId: req.usuario.id, leido: false }, { leido: true });
    res.json({ mensaje: 'Todas marcadas como leídas' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

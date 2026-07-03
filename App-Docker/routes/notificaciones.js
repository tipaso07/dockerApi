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
    const notif = await Notificacion.findOneAndUpdate(
      { _id: req.params.id, usuarioId: req.usuario.id },
      { leido: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/leer-todas', verificarToken, async (req, res) => {
  try {
    await Notificacion.updateMany(
      { usuarioId: req.usuario.id, leido: false },
      { leido: true }
    );
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const notif = await Notificacion.findOneAndDelete({ _id: req.params.id, usuarioId: req.usuario.id });
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ mensaje: 'Notificación eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const notif = await Notificacion.findOne({ _id: req.params.id, usuarioId: req.usuario.id });
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/usuario/:userId', verificarToken, async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({ usuarioId: req.params.userId })
      .sort({ fecha: -1 })
      .limit(50);
    const noLeidas = await Notificacion.countDocuments({ usuarioId: req.params.userId, leido: false });
    res.json({ notificaciones, noLeidas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

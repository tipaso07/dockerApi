const { Router } = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { verificarToken, verificarAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password').sort({ nombre: 1 });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-password');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/perfil', verificarToken, async (req, res) => {
  try {
    const { nombre, bio, avatar, fechaNacimiento } = req.body;
    const update = {};
    if (nombre) update.nombre = nombre;
    if (bio !== undefined) update.bio = bio;
    if (avatar !== undefined) update.avatar = avatar;
    if (fechaNacimiento) update.fechaNacimiento = fechaNacimiento;

    const usuario = await Usuario.findByIdAndUpdate(req.usuario.id, update, { new: true }).select('-password');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body;
    const update = {};
    if (nombre) update.nombre = nombre;
    if (email) update.email = email;
    if (rol) update.rol = rol;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
    }
    const usuario = await Usuario.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-password');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

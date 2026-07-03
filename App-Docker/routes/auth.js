const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { JWT_SECRET } = require('../middleware/auth');

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const usuario = new Usuario({ nombre, email, password: hashed, rol: rol || 'Cliente' });
    await usuario.save();
    const token = jwt.sign({ id: usuario._id, nombre: usuario.nombre, rol: usuario.rol }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    //"admin@delivery.com", "password":"123456"
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }
    const match = await bcrypt.compare(password, usuario.password);
    if (!match) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ id: usuario._id, nombre: usuario.nombre, rol: usuario.rol }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

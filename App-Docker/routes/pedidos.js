const { Router } = require('express');
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');
const { verificarToken, verificarAdmin } = require('../middleware/auth');

const router = Router();

router.post('/', verificarToken, async (req, res) => {
  try {
    const { productosCarrito, metodoPago, direccionEntrega } = req.body;
    const clienteId = req.usuario.id;

    let totalGeneral = 0;
    const productosProcesados = [];

    for (const item of productosCarrito) {
      const producto = await Producto.findById(item.id);
      if (!producto) return res.status(404).json({ error: `Producto ${item.id} no encontrado` });
      if (producto.stock < item.cantidad) return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });
      const subtotal = producto.precio * item.cantidad;
      totalGeneral += subtotal;
      productosProcesados.push({ productoId: item.id, nombre: producto.nombre, precioUnitario: producto.precio, cantidad: item.cantidad, subtotal });
      producto.stock -= item.cantidad;
      await producto.save();
    }

    const igv = Number((totalGeneral * 0.18).toFixed(2));
    const montoTotal = Number((totalGeneral + igv).toFixed(2));
    const numeroBoleta = `B001-${Math.floor(100000 + Math.random() * 900000)}`;

    const nuevoPedido = new Pedido({
      clienteId, metodoPago, direccionEntrega, estado: 'Pendiente',
      boleta: { numeroBoleta, productos: productosProcesados, montoGrabado: Number(totalGeneral.toFixed(2)), igv, montoTotal }
    });

    const pedidoGuardado = await nuevoPedido.save();

    await Usuario.findByIdAndUpdate(clienteId, { $push: { historialCompras: pedidoGuardado._id } });

    const io = req.app.get('io');
    io.emit('alerta_nuevo_pedido', pedidoGuardado);

    res.status(201).json(pedidoGuardado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', verificarToken, async (req, res) => {
  try {
    let pedidos;
    if (req.usuario.rol === 'Admin') {
      pedidos = await Pedido.find().populate('clienteId', 'nombre email').populate('repartidorId', 'nombre').sort({ fecha: -1 });
    } else {
      pedidos = await Pedido.find({ clienteId: req.usuario.id }).populate('repartidorId', 'nombre').sort({ fecha: -1 });
    }
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/entregas', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'Repartidor') return res.status(403).json({ error: 'Solo repartidores' });
    const pedidos = await Pedido.find({
      repartidorId: req.usuario.id,
      estado: { $in: ['Pendiente', 'En Camino', 'Entregado'] }
    }).populate('clienteId', 'nombre email').populate('repartidorId', 'nombre').sort({ fecha: -1 });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/estado', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    let update = { estado };

    if (estado === 'En Camino') {
      const pedidoActual = await Pedido.findById(req.params.id);
      if (!pedidoActual) return res.status(404).json({ error: 'Pedido no encontrado' });
      if (!pedidoActual.repartidorId) {
        const repartidores = await Usuario.find({ rol: 'Repartidor' });
        if (repartidores.length > 0) {
          let mejorRep = null;
          let menorCarga = Infinity;
          for (const rep of repartidores) {
            const count = await Pedido.countDocuments({
              repartidorId: rep._id,
              estado: { $in: ['Pendiente', 'En Camino'] }
            });
            if (count < menorCarga) { menorCarga = count; mejorRep = rep._id; }
          }
          if (mejorRep) update.repartidorId = mejorRep;
        }
      }
    }

    const pedido = await Pedido.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    const io = req.app.get('io');
    io.emit('estado_pedido_actualizado', pedido);
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/repartidor', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { repartidorId } = req.body;
    const pedido = await Pedido.findByIdAndUpdate(req.params.id, { repartidorId: repartidorId || null }, { new: true });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    const io = req.app.get('io');
    io.emit('estado_pedido_actualizado', pedido);
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/entregar', verificarToken, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (pedido.repartidorId.toString() !== req.usuario.id) return res.status(403).json({ error: 'No eres el repartidor asignado' });
    if (pedido.estado !== 'En Camino') return res.status(400).json({ error: 'El pedido debe estar en En Camino' });
    pedido.estado = 'Entregado';
    await pedido.save();
    const io = req.app.get('io');
    io.emit('estado_pedido_actualizado', pedido);
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('clienteId', 'nombre email')
      .populate('repartidorId', 'nombre');
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    // Que solo el admin o el dueño del pedido puedan verlo
    if (req.usuario.rol !== 'Admin' && pedido.clienteId._id.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para ver este pedido' });
    }
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

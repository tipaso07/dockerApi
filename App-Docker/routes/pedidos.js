const express = require('express');
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');
const { verificarToken, verificarAdmin } = require('../middleware/auth');

const router = express.Router();

const ZONAS = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];

async function autoAsignarRepartidor(zonaEntrega) {
  let repartidores;
  if (zonaEntrega) {
    console.log(`[AUTO-ASSIGN] Buscando repartidores en zona: ${zonaEntrega}`);
    repartidores = await Usuario.find({ rol: 'Repartidor', zona: zonaEntrega });
    console.log(`[AUTO-ASSIGN] Encontrados ${repartidores.length} repartidores en zona ${zonaEntrega}`);
  }
  if (!repartidores || repartidores.length === 0) {
    console.log('[AUTO-ASSIGN] Sin repartidores en zona, buscando todos los repartidores');
    repartidores = await Usuario.find({ rol: 'Repartidor' });
    console.log(`[AUTO-ASSIGN] Total repartidores disponibles: ${repartidores.length}`);
  }
  if (repartidores.length === 0) {
    console.log('[AUTO-ASSIGN] NO hay repartidores en la BD');
    return null;
  }

  let mejorRep = null;
  let menorCarga = Infinity;
  for (const rep of repartidores) {
    const count = await Pedido.countDocuments({
      repartidorId: rep._id,
      estado: { $ne: 'Entregado' }
    });
    console.log(`[AUTO-ASSIGN] ${rep.nombre}: ${count} pedidos no entregados`);
    if (count < menorCarga) {
      menorCarga = count;
      mejorRep = rep._id;
    }
  }
  console.log(`[AUTO-ASSIGN] Seleccionado: ${mejorRep} con ${menorCarga} pedidos`);
  return mejorRep;
}

router.post('/', verificarToken, async (req, res) => {
  try {
    const { productosCarrito, metodoPago, direccionEntrega, zonaEntrega } = req.body;
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
      clienteId, metodoPago, direccionEntrega, zonaEntrega: zonaEntrega || '', estado: 'Pendiente',
      boleta: { numeroBoleta, productos: productosProcesados, montoGrabado: Number(totalGeneral.toFixed(2)), igv, montoTotal }
    });

    const pedidoGuardado = await nuevoPedido.save();

    const mejorRep = await autoAsignarRepartidor(zonaEntrega || '');
    if (mejorRep) {
      pedidoGuardado.repartidorId = mejorRep;
      await pedidoGuardado.save();
      console.log(`[POST PEDIDO] Repartidor ${mejorRep} asignado automaticamente`);
    }

    const pedidoPoblado = await Pedido.findById(pedidoGuardado._id)
      .populate('clienteId', 'nombre email')
      .populate('repartidorId', 'nombre');

    await Usuario.findByIdAndUpdate(clienteId, { $push: { historialCompras: pedidoGuardado._id } });

    const io = req.app.get('io');
    io.emit('alerta_nuevo_pedido', pedidoPoblado);

    res.status(201).json(pedidoPoblado);
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
    const { estado, repartidorId, zonaEntrega } = req.body;
    let update = { estado };

    if (zonaEntrega) update.zonaEntrega = zonaEntrega;

    if (repartidorId) {
      update.repartidorId = repartidorId;
    } else if (estado === 'En Camino') {
      const pedidoActual = await Pedido.findById(req.params.id);
      if (!pedidoActual) return res.status(404).json({ error: 'Pedido no encontrado' });
      if (!pedidoActual.repartidorId) {
        const zona = zonaEntrega || pedidoActual.zonaEntrega;
        const mejorRep = await autoAsignarRepartidor(zona);
        if (mejorRep) update.repartidorId = mejorRep;
      }
    }

    let pedido = await Pedido.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    pedido = await Pedido.findById(pedido._id)
      .populate('clienteId', 'nombre email')
      .populate('repartidorId', 'nombre');
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
    let pedido = await Pedido.findByIdAndUpdate(req.params.id, { repartidorId: repartidorId || null }, { new: true });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    pedido = await Pedido.findById(pedido._id)
      .populate('clienteId', 'nombre email')
      .populate('repartidorId', 'nombre');
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
    const pedidoPoblado = await Pedido.findById(pedido._id)
      .populate('clienteId', 'nombre email')
      .populate('repartidorId', 'nombre');
    const io = req.app.get('io');
    io.emit('estado_pedido_actualizado', pedidoPoblado);
    res.json(pedidoPoblado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

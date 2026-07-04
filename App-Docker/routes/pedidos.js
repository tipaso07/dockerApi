const express = require('express');
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');
const { verificarToken, verificarAdmin } = require('../middleware/auth');

const router = express.Router();

function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const RADIO_MAX_KM = 50;

async function autoAsignarRepartidor(lat, lng) {
  const repartidores = await Usuario.find({ rol: 'Repartidor' });
  if (repartidores.length === 0) {
    console.log('[AUTO-ASSIGN] NO hay repartidores en la BD');
    return null;
  }

  let candidatos = [];
  for (const rep of repartidores) {
    if (rep.ubicacion?.lat != null && rep.ubicacion?.lng != null) {
      const dist = calcularDistancia(lat, lng, rep.ubicacion.lat, rep.ubicacion.lng);
      console.log(`[AUTO-ASSIGN] ${rep.nombre}: ${dist.toFixed(2)} km de distancia`);
      if (dist <= RADIO_MAX_KM) {
        const count = await Pedido.countDocuments({
          repartidorId: rep._id,
          estado: { $ne: 'Entregado' }
        });
        candidatos.push({ id: rep._id, distancia: dist, carga: count });
      }
    } else {
      candidatos.push({ id: rep._id, distancia: Infinity, carga: 0 });
    }
  }

  if (candidatos.length === 0) {
    console.log('[AUTO-ASSIGN] Sin candidatos disponibles');
    return null;
  }

  candidatos.sort((a, b) => {
    if (a.distancia !== b.distancia) return a.distancia - b.distancia;
    return a.carga - b.carga;
  });

  const elegido = candidatos[0];
  console.log(`[AUTO-ASSIGN] Seleccionado: ${elegido.id} (dist: ${elegido.distancia.toFixed(2)}km, carga: ${elegido.carga})`);
  return elegido.id;
}

router.post('/', verificarToken, async (req, res) => {
  try {
    const { productosCarrito, metodoPago, direccionEntrega, zonaEntrega, lat, lng } = req.body;
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
      clienteId, metodoPago, direccionEntrega,
      zonaEntrega: zonaEntrega || '',
      lat: lat != null ? lat : null,
      lng: lng != null ? lng : null,
      estado: 'Pendiente',
      boleta: { numeroBoleta, productos: productosProcesados, montoGrabado: Number(totalGeneral.toFixed(2)), igv, montoTotal }
    });

    const pedidoGuardado = await nuevoPedido.save();

    const deliveryLat = lat != null ? lat : null;
    const deliveryLng = lng != null ? lng : null;
    if (deliveryLat != null && deliveryLng != null) {
      const mejorRep = await autoAsignarRepartidor(deliveryLat, deliveryLng);
      if (mejorRep) {
        pedidoGuardado.repartidorId = mejorRep;
        await pedidoGuardado.save();
        console.log(`[POST PEDIDO] Repartidor ${mejorRep} asignado automaticamente`);
      }
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
        const dLat = pedidoActual.lat;
        const dLng = pedidoActual.lng;
        if (dLat != null && dLng != null) {
          const mejorRep = await autoAsignarRepartidor(dLat, dLng);
          if (mejorRep) update.repartidorId = mejorRep;
        }
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

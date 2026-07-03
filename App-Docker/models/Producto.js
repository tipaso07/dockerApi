const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  categoria: { type: String, required: true, index: true },
  valoracion: { type: Number, default: 0 },
  descripcion: { type: String, default: '' }
});

module.exports = mongoose.model('Producto', ProductoSchema);

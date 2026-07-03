const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  contenido: { type: String, required: true },
  autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);

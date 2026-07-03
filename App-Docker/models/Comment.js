const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  contenido: { type: String, required: true },
  autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', CommentSchema);

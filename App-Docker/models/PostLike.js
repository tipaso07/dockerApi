const mongoose = require('mongoose');

const PostLikeSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now }
});

PostLikeSchema.index({ postId: 1, usuarioId: 1 }, { unique: true });

module.exports = mongoose.model('PostLike', PostLikeSchema);

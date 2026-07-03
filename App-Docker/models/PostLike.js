const mongoose = require('mongoose');

const PostLikeSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now }
}, { collection: 'post_likes' });

module.exports = mongoose.model('PostLike', PostLikeSchema);

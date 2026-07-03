const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema({
  seguidor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  seguido: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now }
}, { collection: 'seguidores' });

FollowSchema.index({ seguidor: 1, seguido: 1 }, { unique: true });

module.exports = mongoose.model('Follow', FollowSchema);

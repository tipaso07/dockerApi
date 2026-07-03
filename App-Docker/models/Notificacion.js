const mongoose = require('mongoose');

const NotificacionSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  tipo: { type: String, enum: ['like', 'comentario', 'seguidor'], required: true },
  mensaje: { type: String, required: true },
  leido: { type: Boolean, default: false },
  referenciaId: { type: mongoose.Schema.Types.ObjectId, default: null },
  fecha: { type: Date, default: Date.now }
});

NotificacionSchema.index({ usuarioId: 1, leido: 1, fecha: -1 });

module.exports = mongoose.model('Notificacion', NotificacionSchema);

const mongoose = require('mongoose');

const NotificacionSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  tipo: { type: String, enum: ['like', 'comentario', 'seguidor'], required: true },
  mensaje: { type: String, required: true },
  referenciaId: { type: mongoose.Schema.Types.ObjectId },
  leido: { type: Boolean, default: false },
  fecha: { type: Date, default: Date.now }
});

NotificacionSchema.index({ usuarioId: 1, leido: 1 });

module.exports = mongoose.model('Notificacion', NotificacionSchema);
